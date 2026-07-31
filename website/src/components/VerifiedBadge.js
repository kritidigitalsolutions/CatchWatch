import { MdVerified } from "react-icons/md";

const VerifiedBadge = ({ user, isVerified, size = "md", className = "" }) => {
  const verified =
    isVerified === true ||
    user?.verification?.isVerified === true ||
    user?.verification?.status === "VERIFIED" ||
    user?.isVerified === true;

  if (!verified) return null;

  const sizeMap = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-6 h-6",
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  return (
    <span
      className={`inline-flex items-center justify-center text-blue-500 flex-shrink-0 align-middle ${className}`}
      title="Verified Account"
    >
      {/* <svg
        className={`${currentSizeClass} fill-current`}
        viewBox="0 0 24 24"
        aria-label="Verified"
        >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.06 13.54L6.4 11.01l1.41-1.41 3.13 3.13 6.64-6.64 1.41 1.41-7.94 8.04z" fill="#3b82f6" />
        <path d="M10.94 15.54L6.4 11.01l1.41-1.41 3.13 3.13 6.64-6.64 1.41 1.41-7.94 8.04z" fill="#ffffff" />
        </svg> */}
      <div className={`${currentSizeClass} fill-current`}>
      <MdVerified />
      </div>
    </span>
  );
};

export default VerifiedBadge;
