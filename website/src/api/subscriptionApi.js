import axiosInstance from "./axiosConfig";

// Plans
export const getPlans = async () => {
  const response = await axiosInstance.get("/plan");
  return response.data;
};

// Subscriptions
export const createPlan = async (data) => {
  const response = await axiosInstance.post("/subscription/create-plan", data);
  return response.data;
};

export const createSubscription = async (data) => {
  const response = await axiosInstance.post("/subscription/create-subscription", data);
  return response.data;
};

export const subscribeToPlan = async (data) => {
  const response = await axiosInstance.post("/subscription/subscribe", data);
  return response.data;
};

export const getSubscriptionStatus = async () => {
  const response = await axiosInstance.get("/subscription/status");
  return response.data;
};

// export const cancelSubscription = async (data) => {
//   const response = await axiosInstance.delete("/subscription/cancel", { data });
//   return response.data;
// };

// Vouchers & Promos
export const applyPromo = async (data) => {
  const response = await axiosInstance.post("/promo/apply", data);
  return response.data;
};

export const redeemVoucher = async (data) => {
  const response = await axiosInstance.post("/voucher/redeem", data);
  return response.data;
};

// Payment APIs
export const createPaymentOrder = async (data) => {
  const response = await axiosInstance.post("/payment/create-order", data);
  return response.data;
};

export const verifyPayment = async (data) => {
  const response = await axiosInstance.post("/payment/verify", data);
  return response.data;
};