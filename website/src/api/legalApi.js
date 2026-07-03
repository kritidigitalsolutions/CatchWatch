import axiosInstance from "./axiosConfig";

export const getLegalDocs = async () => {
  const response = await axiosInstance.get("/legal");
  return response.data;
};

export const getLegalDocByType = async (type) => {
  const response = await axiosInstance.get(`/legal/${type}`);
  return response.data;
};