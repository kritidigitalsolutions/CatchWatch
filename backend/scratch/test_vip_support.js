const axios = require('axios');

async function testVipSupport() {
  console.log("Testing VIP Support Backend API...");
  
  try {
    const res = await axios.get("http://localhost:5000/api/support/vip/access-check");
    console.log("Response:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("Status:", err.response.status);
      console.log("Data:", err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

testVipSupport();
