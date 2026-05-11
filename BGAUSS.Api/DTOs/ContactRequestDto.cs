namespace BGAUSS.Api.DTOs;
public class ContactRequestDto
    {
        public string? Subject    { get; set; }
        public string? Salutation { get; set; }
        public string? FirstName  { get; set; }
        public string? LastName   { get; set; }
        public string? Company    { get; set; }
        public string? Email      { get; set; }   // sender's email (reply-to)
        public string? Phone      { get; set; }
        public string? Message    { get; set; }
    }
