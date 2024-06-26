import Link from 'next/link';
import { FaHome, FaTrash, FaRoute, FaDatabase, FaCommentDots, FaTimes, FaPlus, FaSun, FaEdit } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { session, isAdmin } = useAuth();

  return (
    <div className={`bg-gray-700 text-white fixed top-0 left-0 w-64 h-full transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-50`}>
      <button onClick={toggleSidebar} className="text-white p-4 flex items-center">
        <FaTimes className="mr-2" />
        Close
      </button>
      <ul className="mt-4">
        <li className="flex items-center p-4 border-b border-gray-600">
          <FaHome className="mr-2" />
          <Link href="/" onClick={toggleSidebar}>Home</Link>
        </li>
        <li className="flex items-center p-4 border-b border-gray-600">
          <FaTrash className="mr-2" />
          <Link href="/waste-bins" onClick={toggleSidebar}>Bins</Link>
        </li>
        <li className="flex items-center p-4 border-b border-gray-600">
          <FaSun className="mr-2" />
          <Link href="/weather-sensors" onClick={toggleSidebar}>Weather Sensors</Link>
        </li>
        <li className="flex items-center p-4 border-b border-gray-600">
          <FaRoute className="mr-2" />
          <Link href="/routes" onClick={toggleSidebar}>Routes</Link>
        </li>
        <li className="flex items-center p-4 border-b border-gray-600">
          <FaCommentDots className="mr-2" />
          <Link href="/feedback" onClick={toggleSidebar}>Feedback</Link>
        </li>
        {isAdmin && (
          <>
            <li className="flex items-center p-4 border-b border-gray-600">
              <FaDatabase className="mr-2" />
              <Link href="/historical-data" onClick={toggleSidebar}>Data</Link>
            </li>
            {/* <li className="flex items-center p-4 border-b border-gray-600">
              <FaEdit className="mr-2" />
              <Link href="/update-device" onClick={toggleSidebar}>Update Device</Link>
            </li> */}
            <li className="flex items-center p-4 border-b border-gray-600">
              <FaPlus className="mr-2" />
              <Link href="/register-device" onClick={toggleSidebar}>Register New Device</Link>
            </li>

          </>
        )}
      </ul>
    </div>
  );
}
