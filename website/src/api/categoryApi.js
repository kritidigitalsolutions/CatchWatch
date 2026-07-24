import axiosInstance from "./axiosConfig";

export const getCategories = async () => {
  try {
    const response = await axiosInstance.get("/categories");
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, categories: [] };
  }
};
