import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Not found');
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link
        to="/"
        className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        Go home
      </Link>
    </div>
  );
}
