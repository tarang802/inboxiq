import { Loader2Icon } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="flex justify-center py-16 text-muted-foreground" role="status">
      <Loader2Icon className="size-6 animate-spin" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
