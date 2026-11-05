import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Not found');
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
