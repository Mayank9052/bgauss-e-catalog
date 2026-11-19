// Services/XlsxPreviewReader.cs
// Reads an .xlsx workbook (Office Open XML) with the .NET zip + XML libraries only
// and turns it into a lightweight preview model the browser can draw as an HTML table:
// cell text, merged cells, column widths, row heights, fill/font colours, bold/italic,
// alignment, and Excel 365 "picture in cell" images (rich data).
// No third-party Excel library is used, so no extra licence is involved.

using System.Globalization;
using System.IO.Compression;
using System.Xml.Linq;

namespace BGAUSS.Api.Services;

public sealed class XlsxPreview
{
    public List<XlsxPreviewSheet> Sheets { get; set; } = new();
}

public sealed class XlsxPreviewSheet
{
    public string Name { get; set; } = "";
    public int ColumnCount { get; set; }
    public List<int> ColumnWidths { get; set; } = new();     // px
    public List<XlsxPreviewRow> Rows { get; set; } = new();
    public bool Truncated { get; set; }
}

public sealed class XlsxPreviewRow
{
    public int Index { get; set; }                            // 1-based Excel row number
    public int? Height { get; set; }                          // px
    public List<XlsxPreviewCell?> Cells { get; set; } = new();
}

public sealed class XlsxPreviewCell
{
    public string? Text { get; set; }
    public string? Bg { get; set; }          // "#RRGGBB"
    public string? Color { get; set; }       // font colour
    public bool Bold { get; set; }
    public bool Italic { get; set; }
    public double? Size { get; set; }        // pt
    public string? Align { get; set; }       // left | center | right
    public string? VAlign { get; set; }      // top | middle | bottom
    public bool Wrap { get; set; }
    public int ColSpan { get; set; } = 1;
    public int RowSpan { get; set; } = 1;
    public bool Covered { get; set; }        // hidden by a merge — do not draw
    public int? Image { get; set; }          // index into the workbook's in-cell images
}

public static class XlsxPreviewReader
{
    private static readonly XNamespace S   = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static readonly XNamespace R   = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static readonly XNamespace Pkg = "http://schemas.openxmlformats.org/package/2006/relationships";
    private static readonly XNamespace A   = "http://schemas.openxmlformats.org/drawingml/2006/main";
    private static readonly XNamespace Rd  = "http://schemas.microsoft.com/office/spreadsheetml/2017/richdata";
    private static readonly XNamespace Rvr = "http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel";

    public const int MaxRows = 1000;
    public const int MaxCols = 60;

    // ── public API ─────────────────────────────────────────────────────────────

    public static XlsxPreview Read(string path)
    {
        using var zip = ZipFile.OpenRead(path);
        var ctx = new Ctx(zip);
        var preview = new XlsxPreview();

        var wb = Load(zip, "xl/workbook.xml");
        if (wb == null) return preview;
        var wbRels = Rels(zip, "xl/_rels/workbook.xml.rels");

        foreach (var sh in wb.Descendants(S + "sheet"))
        {
            if ((string?)sh.Attribute("state") is "hidden" or "veryHidden") continue;
            var rid = (string?)sh.Attribute(R + "id");
            if (rid == null || !wbRels.TryGetValue(rid, out var target)) continue;
            var sheetPath = Combine("xl", target);
            var xml = Load(zip, sheetPath);
            if (xml == null) continue;
            preview.Sheets.Add(ReadSheet(ctx, (string?)sh.Attribute("name") ?? "Sheet", xml));
        }
        return preview;
    }

    /// <summary>Returns the bytes and content type of the n-th in-cell image (0-based), or null.</summary>
    public static (byte[] Data, string ContentType)? ReadImage(string path, int index)
    {
        using var zip = ZipFile.OpenRead(path);
        var images = ImageTargets(zip);
        if (index < 0 || index >= images.Count) return null;
        var entry = zip.GetEntry(images[index]);
        if (entry == null) return null;
        using var s = entry.Open();
        using var ms = new MemoryStream();
        s.CopyTo(ms);
        var ext = Path.GetExtension(images[index]).ToLowerInvariant();
        var type = ext switch { ".png" => "image/png", ".jpg" or ".jpeg" => "image/jpeg", ".gif" => "image/gif", ".bmp" => "image/bmp", ".webp" => "image/webp", _ => "application/octet-stream" };
        return (ms.ToArray(), type);
    }

    // ── sheet ──────────────────────────────────────────────────────────────────

    private static XlsxPreviewSheet ReadSheet(Ctx ctx, string name, XDocument xml)
    {
        var sheet = new XlsxPreviewSheet { Name = name };
        var data = xml.Root?.Element(S + "sheetData");

        // default sizes
        var fmt = xml.Root?.Element(S + "sheetFormatPr");
        double defColW = Dbl(fmt?.Attribute("defaultColWidth")) ?? (Dbl(fmt?.Attribute("baseColWidth")) is double b ? b + 0.71 : 8.43);
        double defRowPt = Dbl(fmt?.Attribute("defaultRowHeight")) ?? 15;

        // raw cells
        var cells = new Dictionary<(int r, int c), XlsxPreviewCell>();
        var rowHeights = new Dictionary<int, int?>();
        var hiddenRows = new HashSet<int>();
        int maxRow = 0, maxCol = 0;

        foreach (var row in data?.Elements(S + "row") ?? Enumerable.Empty<XElement>())
        {
            int r = (int?)row.Attribute("r") ?? 0;
            if (r <= 0) continue;
            if ((string?)row.Attribute("hidden") is "1" or "true") { hiddenRows.Add(r); continue; }
            if (Dbl(row.Attribute("ht")) is double ht) rowHeights[r] = PtToPx(ht);

            foreach (var c in row.Elements(S + "c"))
            {
                var (cr, cc) = ParseRef((string?)c.Attribute("r"));
                if (cr <= 0 || cc <= 0 || cc > MaxCols) continue;
                var cell = ReadCell(ctx, c);
                if (cell == null) continue;
                cells[(cr, cc)] = cell;
                bool visible = cell.Text != null || cell.Image != null || cell.Bg != null;
                if (visible) { maxRow = Math.Max(maxRow, cr); maxCol = Math.Max(maxCol, cc); }
            }
        }

        // merges
        foreach (var m in xml.Root?.Element(S + "mergeCells")?.Elements(S + "mergeCell") ?? Enumerable.Empty<XElement>())
        {
            var parts = ((string?)m.Attribute("ref") ?? "").Split(':');
            if (parts.Length != 2) continue;
            var (r1, c1) = ParseRef(parts[0]);
            var (r2, c2) = ParseRef(parts[1]);
            if (r1 <= 0 || c1 <= 0 || c1 > MaxCols) continue;
            c2 = Math.Min(c2, MaxCols);
            if (!cells.TryGetValue((r1, c1), out var top)) cells[(r1, c1)] = top = new XlsxPreviewCell();
            top.RowSpan = r2 - r1 + 1;
            top.ColSpan = c2 - c1 + 1;
            for (int r = r1; r <= r2; r++)
                for (int c = c1; c <= c2; c++)
                    if (r != r1 || c != c1)
                    {
                        if (!cells.TryGetValue((r, c), out var cov)) cells[(r, c)] = cov = new XlsxPreviewCell();
                        cov.Covered = true;
                    }
            if (top.Text != null || top.Image != null || top.Bg != null)
            { maxRow = Math.Max(maxRow, r2); maxCol = Math.Max(maxCol, c2); }
        }

        if (maxRow > MaxRows) { sheet.Truncated = true; maxRow = MaxRows; }
        sheet.ColumnCount = maxCol;

        // column widths
        var colW = new double?[maxCol + 1];
        var hiddenCols = new HashSet<int>();
        foreach (var col in xml.Root?.Element(S + "cols")?.Elements(S + "col") ?? Enumerable.Empty<XElement>())
        {
            int min = (int?)col.Attribute("min") ?? 0, max = (int?)col.Attribute("max") ?? 0;
            var w = Dbl(col.Attribute("width"));
            bool hidden = (string?)col.Attribute("hidden") is "1" or "true";
            for (int c = Math.Max(1, min); c <= Math.Min(max, maxCol); c++)
            {
                colW[c] = w;
                if (hidden) hiddenCols.Add(c);
            }
        }
        for (int c = 1; c <= maxCol; c++)
            sheet.ColumnWidths.Add(hiddenCols.Contains(c) ? 0 : CharsToPx(colW[c] ?? defColW));

        // rows
        for (int r = 1; r <= maxRow; r++)
        {
            if (hiddenRows.Contains(r)) continue;
            var pr = new XlsxPreviewRow { Index = r, Height = rowHeights.TryGetValue(r, out var h) ? h : PtToPx(defRowPt) };
            for (int c = 1; c <= maxCol; c++)
            {
                cells.TryGetValue((r, c), out var cell);
                if (cell != null && hiddenCols.Contains(c)) cell = new XlsxPreviewCell { Covered = true };
                pr.Cells.Add(cell);
            }
            sheet.Rows.Add(pr);
        }
        return sheet;
    }

    private static XlsxPreviewCell? ReadCell(Ctx ctx, XElement c)
    {
        var cell = new XlsxPreviewCell();
        var t = (string?)c.Attribute("t");
        var v = c.Element(S + "v")?.Value;

        // Excel 365 picture in cell: value is an error placeholder, vm points at rich data
        if ((string?)c.Attribute("vm") is string vm && int.TryParse(vm, out var vmIdx) && ctx.ImageForVm(vmIdx) is int img)
            cell.Image = img;
        else
            cell.Text = t switch
            {
                "s"         => int.TryParse(v, out var si) && si >= 0 && si < ctx.SharedStrings.Count ? ctx.SharedStrings[si] : null,
                "inlineStr" => string.Concat(c.Element(S + "is")?.Descendants(S + "t").Select(x => x.Value) ?? Array.Empty<string>()),
                "b"         => v == "1" ? "TRUE" : v == "0" ? "FALSE" : v,
                "e"         => null,   // formula errors (#VALUE!, #N/A …) are not shown
                _           => FormatNumber(v),
            };
        if (string.IsNullOrEmpty(cell.Text)) cell.Text = null;

        if (int.TryParse((string?)c.Attribute("s"), out var styleIdx)) ctx.ApplyStyle(styleIdx, cell);
        return cell;
    }

    private static string? FormatNumber(string? v)
    {
        if (string.IsNullOrEmpty(v)) return null;
        if (double.TryParse(v, NumberStyles.Float, CultureInfo.InvariantCulture, out var d))
            return Math.Abs(d % 1) < 1e-9 && Math.Abs(d) < 1e15
                ? d.ToString("0", CultureInfo.InvariantCulture)
                : Math.Round(d, 4).ToString(CultureInfo.InvariantCulture);
        return v;
    }

    // ── workbook-level context (shared strings, styles, theme, rich images) ─────

    private sealed class Ctx
    {
        public readonly List<string> SharedStrings = new();
        private readonly List<XElement> _xfs = new(), _fonts = new(), _fills = new();
        private readonly List<string> _theme = new();
        private readonly Dictionary<int, int> _vmToImage = new();

        public Ctx(ZipArchive zip)
        {
            var ss = Load(zip, "xl/sharedStrings.xml");
            if (ss != null)
                foreach (var si in ss.Root!.Elements(S + "si"))
                    SharedStrings.Add(string.Concat(si.Descendants(S + "t").Select(x => x.Value)));

            var st = Load(zip, "xl/styles.xml");
            if (st != null)
            {
                _xfs.AddRange(st.Root!.Element(S + "cellXfs")?.Elements(S + "xf") ?? Enumerable.Empty<XElement>());
                _fonts.AddRange(st.Root!.Element(S + "fonts")?.Elements(S + "font") ?? Enumerable.Empty<XElement>());
                _fills.AddRange(st.Root!.Element(S + "fills")?.Elements(S + "fill") ?? Enumerable.Empty<XElement>());
            }

            var th = Load(zip, "xl/theme/theme1.xml");
            var scheme = th?.Descendants(A + "clrScheme").FirstOrDefault();
            if (scheme != null)
            {
                string Col(string n)
                {
                    var e = scheme.Element(A + n)?.Elements().FirstOrDefault();
                    return (string?)e?.Attribute("lastClr") ?? (string?)e?.Attribute("val") ?? "000000";
                }
                // Excel's theme index order: lt1, dk1, lt2, dk2, accent1..6, hlink, folHlink
                foreach (var n in new[] { "lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink" })
                    _theme.Add(Col(n));
            }

            BuildRichImageMap(zip);
        }

        public int? ImageForVm(int vm) => _vmToImage.TryGetValue(vm, out var i) ? i : null;

        public void ApplyStyle(int idx, XlsxPreviewCell cell)
        {
            if (idx < 0 || idx >= _xfs.Count) return;
            var xf = _xfs[idx];

            if (int.TryParse((string?)xf.Attribute("fillId"), out var fi) && fi >= 0 && fi < _fills.Count)
            {
                var pf = _fills[fi].Element(S + "patternFill");
                var type = (string?)pf?.Attribute("patternType");
                if (pf != null && type != null && type != "none")
                    cell.Bg = ColourOf(pf.Element(S + "fgColor")) ?? ColourOf(pf.Element(S + "bgColor"));
            }

            if (int.TryParse((string?)xf.Attribute("fontId"), out var fo) && fo >= 0 && fo < _fonts.Count)
            {
                var f = _fonts[fo];
                cell.Bold = IsOn(f.Element(S + "b"));
                cell.Italic = IsOn(f.Element(S + "i"));
                cell.Size = Dbl(f.Element(S + "sz")?.Attribute("val"));
                var fc = ColourOf(f.Element(S + "color"));
                if (fc != null && fc != "#000000") cell.Color = fc;
            }

            var al = xf.Element(S + "alignment");
            if (al != null)
            {
                cell.Align = (string?)al.Attribute("horizontal") switch
                {
                    "center" or "centerContinuous" => "center",
                    "right" => "right",
                    "left" => "left",
                    _ => null,
                };
                cell.VAlign = (string?)al.Attribute("vertical") switch { "top" => "top", "center" => "middle", _ => null };
                cell.Wrap = IsOn(al.Attribute("wrapText"));
            }
        }

        private static bool IsOn(XElement? e) => e != null && (string?)e.Attribute("val") is null or "1" or "true";
        private static bool IsOn(XAttribute? a) => (string?)a is "1" or "true";

        private string? ColourOf(XElement? c)
        {
            if (c == null) return null;
            string? hex = null;
            if ((string?)c.Attribute("rgb") is string rgb && rgb.Length >= 6) hex = rgb[^6..];
            else if (int.TryParse((string?)c.Attribute("theme"), out var t) && t >= 0 && t < _theme.Count) hex = _theme[t];
            else if (int.TryParse((string?)c.Attribute("indexed"), out var ix) && ix >= 0 && ix < Indexed.Length) hex = Indexed[ix];
            if (hex == null) return null;
            var tint = Dbl(c.Attribute("tint")) ?? 0;
            return "#" + (Math.Abs(tint) > 0.0001 ? ApplyTint(hex, tint) : hex).ToUpperInvariant();
        }

        /// <summary>Maps the cell "vm" attribute (1-based) to an index in <see cref="ImageTargets"/>.</summary>
        private void BuildRichImageMap(ZipArchive zip)
        {
            try
            {
                var meta = Load(zip, "xl/metadata.xml");
                var rv = Load(zip, "xl/richData/rdrichvalue.xml");
                var rvs = Load(zip, "xl/richData/rdrichvaluestructure.xml");
                var rel = Load(zip, "xl/richData/richValueRel.xml");
                if (meta == null || rv == null || rvs == null || rel == null) return;

                var images = ImageTargets(zip);
                var relRels = Rels(zip, "xl/richData/_rels/richValueRel.xml.rels");
                var relIds = rel.Root!.Elements(Rvr + "rel").Select(e => (string?)e.Attribute(R + "id")).ToList();

                // structure index → position of the image key within <v> values
                var structures = rvs.Root!.Elements(Rd + "s").Select(s =>
                    s.Elements(Rd + "k").ToList().FindIndex(k => (string?)k.Attribute("n") == "_rvRel:LocalImageIdentifier")).ToList();
                var values = rv.Root!.Elements(Rd + "rv").ToList();

                var future = meta.Root!.Elements(S + "futureMetadata").FirstOrDefault(f => (string?)f.Attribute("name") == "XLRICHVALUE");
                var futureBks = future?.Elements(S + "bk").ToList() ?? new List<XElement>();
                var valueBks = meta.Root!.Element(S + "valueMetadata")?.Elements(S + "bk").ToList() ?? new List<XElement>();

                for (int vm = 1; vm <= valueBks.Count; vm++)
                {
                    var rc = valueBks[vm - 1].Element(S + "rc");
                    if (!int.TryParse((string?)rc?.Attribute("v"), out var fIdx) || fIdx < 0 || fIdx >= futureBks.Count) continue;
                    var rvb = futureBks[fIdx].Descendants(Rd + "rvb").FirstOrDefault();
                    if (!int.TryParse((string?)rvb?.Attribute("i"), out var rvIdx) || rvIdx < 0 || rvIdx >= values.Count) continue;
                    var value = values[rvIdx];
                    if (!int.TryParse((string?)value.Attribute("s"), out var sIdx) || sIdx < 0 || sIdx >= structures.Count) continue;
                    var keyPos = structures[sIdx];
                    var vs = value.Elements(Rd + "v").ToList();
                    if (keyPos < 0 || keyPos >= vs.Count || !int.TryParse(vs[keyPos].Value, out var relIdx)) continue;
                    if (relIdx < 0 || relIdx >= relIds.Count || relIds[relIdx] is not string rid) continue;
                    if (!relRels.TryGetValue(rid, out var target)) continue;
                    var full = Combine("xl/richData", target);
                    var imgIdx = images.IndexOf(full);
                    if (imgIdx >= 0) _vmToImage[vm] = imgIdx;
                }
            }
            catch
            {
                // a workbook without readable rich data simply shows no in-cell pictures
            }
        }
    }

    /// <summary>Zip paths of all images referenced from rich data, in a stable order.</summary>
    private static List<string> ImageTargets(ZipArchive zip)
    {
        var rels = Rels(zip, "xl/richData/_rels/richValueRel.xml.rels");
        return rels.Values.Select(t => Combine("xl/richData", t)).Distinct().OrderBy(x => x, StringComparer.Ordinal).ToList();
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static XDocument? Load(ZipArchive zip, string path)
    {
        var e = zip.GetEntry(path);
        if (e == null) return null;
        using var s = e.Open();
        return XDocument.Load(s);
    }

    private static Dictionary<string, string> Rels(ZipArchive zip, string path)
    {
        var d = new Dictionary<string, string>();
        var x = Load(zip, path);
        if (x == null) return d;
        foreach (var r in x.Root!.Elements(Pkg + "Relationship"))
            if ((string?)r.Attribute("Id") is string id && (string?)r.Attribute("Target") is string t)
                d[id] = t;
        return d;
    }

    /// <summary>Resolves a relationship target relative to a base folder inside the zip.</summary>
    private static string Combine(string baseDir, string target)
    {
        if (target.StartsWith('/')) return target.TrimStart('/');
        var parts = new List<string>(baseDir.Split('/', StringSplitOptions.RemoveEmptyEntries));
        foreach (var seg in target.Split('/'))
        {
            if (seg == "..") { if (parts.Count > 0) parts.RemoveAt(parts.Count - 1); }
            else if (seg != "." && seg.Length > 0) parts.Add(seg);
        }
        return string.Join('/', parts);
    }

    private static (int row, int col) ParseRef(string? cellRef)
    {
        if (string.IsNullOrEmpty(cellRef)) return (0, 0);
        int col = 0, i = 0;
        while (i < cellRef.Length && char.IsLetter(cellRef[i])) { col = col * 26 + (char.ToUpperInvariant(cellRef[i]) - 'A' + 1); i++; }
        return int.TryParse(cellRef[i..], out var row) ? (row, col) : (0, 0);
    }

    private static double? Dbl(XAttribute? a) =>
        a != null && double.TryParse(a.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : null;

    private static int PtToPx(double pt) => (int)Math.Round(pt * 96 / 72);
    private static int CharsToPx(double chars) => (int)Math.Round(chars * 7 + 5);

    private static string ApplyTint(string hex, double tint)
    {
        int r = Convert.ToInt32(hex[..2], 16), g = Convert.ToInt32(hex.Substring(2, 2), 16), b = Convert.ToInt32(hex.Substring(4, 2), 16);
        RgbToHsl(r, g, b, out var h, out var s, out var l);
        l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
        HslToRgb(h, s, Math.Clamp(l, 0, 1), out r, out g, out b);
        return $"{r:X2}{g:X2}{b:X2}";
    }

    private static void RgbToHsl(int r, int g, int b, out double h, out double s, out double l)
    {
        double rf = r / 255.0, gf = g / 255.0, bf = b / 255.0;
        double max = Math.Max(rf, Math.Max(gf, bf)), min = Math.Min(rf, Math.Min(gf, bf));
        l = (max + min) / 2;
        if (max == min) { h = s = 0; return; }
        double d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        h = max == rf ? (gf - bf) / d + (gf < bf ? 6 : 0) : max == gf ? (bf - rf) / d + 2 : (rf - gf) / d + 4;
        h /= 6;
    }

    private static void HslToRgb(double h, double s, double l, out int r, out int g, out int b)
    {
        if (s == 0) { r = g = b = (int)Math.Round(l * 255); return; }
        double q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        double Hue(double t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1.0 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2.0 / 3 ? p + (q - p) * (2.0 / 3 - t) * 6 : p; }
        r = (int)Math.Round(Hue(h + 1.0 / 3) * 255); g = (int)Math.Round(Hue(h) * 255); b = (int)Math.Round(Hue(h - 1.0 / 3) * 255);
    }

    // Excel's legacy indexed colour palette (0–63)
    private static readonly string[] Indexed =
    {
        "000000","FFFFFF","FF0000","00FF00","0000FF","FFFF00","FF00FF","00FFFF",
        "000000","FFFFFF","FF0000","00FF00","0000FF","FFFF00","FF00FF","00FFFF",
        "800000","008000","000080","808000","800080","008080","C0C0C0","808080",
        "9999FF","993366","FFFFCC","CCFFFF","660066","FF8080","0066CC","CCCCFF",
        "000080","FF00FF","FFFF00","00FFFF","800080","800000","008080","0000FF",
        "00CCFF","CCFFFF","CCFFCC","FFFF99","99CCFF","FF99CC","CC99FF","FFCC99",
        "3366FF","33CCCC","99CC00","FFCC00","FF9900","FF6600","666699","969696",
        "003366","339966","003300","333300","993300","993366","333399","333333",
    };
}
