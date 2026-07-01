/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#FF6600',
        'brand-light-bg': '#FFF5ED',
      }
    }
  },
  plugins: [],
}


// const withMT = require("@material-tailwind/react/utils/withMT");
// module.exports = withMT({
//   content: ["./index.html"],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// });