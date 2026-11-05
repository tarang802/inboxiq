import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

const CONFIRM_WORD = 'delete';

export default function Account() {
  usePageTitle('Account');
  const { user, deleteAccount, refresh } = useAuth();
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      navigate('/?deleted=1', { replace: true });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not delete your data');
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-muted-foreground">Signed in as {user?.email}.</p>
      </div>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Delete my data</CardTitle>
          <CardDescription>
            This removes your Sieve account, your sender list, sync history and the stored Google
            token, and tells Google to revoke Sieve's access. Senders you unsubscribed from stay
            unsubscribed. This can't be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="confirm-delete" className="font-normal">
            Type <span className="font-mono font-medium">{CONFIRM_WORD}</span> to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="sm:w-64"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={typed.trim().toLowerCase() !== CONFIRM_WORD || busy}
          >
            <Trash2Icon />
            {busy ? 'Deleting…' : 'Delete everything'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
