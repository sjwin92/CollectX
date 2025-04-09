
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">Oops! Page not found</p>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
