import axios from "axios";

export const commonSearch = async <T>(
  entity: string,
  query: string
): Promise<T[]> => {

  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const response = await axios.get<T[]>(
    `/commonsearch/${entity}`,
    {
      params: {
        query: trimmedQuery
      }
    }
  );

  return response.data;
};
