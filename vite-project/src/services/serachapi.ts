import axios from "axios";

const API_BASE = "http://localhost:5053/api/CommonSearch";

export const commonSearch = async (
  entity: string,
  query: string
) => {

  const response = await axios.get(
    `${API_BASE}/${entity}?query=${query}`
  );

  return response.data;
};