import * as React from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

import {
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  unlink,
  reload,
  type AuthError,
} from 'firebase/auth';
import { auth } from '../../firebase';

function hasGoogleProvider() {
  const p = auth.currentUser?.providerData ?? [];
  return p.some((x) => x.providerId === 'google.com');
}
function hasPasswordProvider() {
  const p = auth.currentUser?.providerData ?? [];
  return p.some((x) => x.providerId === 'password');
}

export default function GoogleLinkSection() {
  const [isLinked, setIsLinked] = React.useState<boolean>(hasGoogleProvider());
  const [msg, setMsg] = React.useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setIsLinked(hasGoogleProvider());
  }, []);

  const linkNow = async () => {
    setMsg(null);
    setBusy(true);
    try {
      if (!auth.currentUser) throw new Error('Not signed in');

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        await linkWithPopup(auth.currentUser, provider);
      } catch (e: any) {
        const err = e as AuthError;
        // If the popup is blocked/closed, fall back to redirect flow
        if (
          err.code === 'auth/popup-blocked' ||
          err.code === 'auth/popup-closed-by-user'
        ) {
          await linkWithRedirect(auth.currentUser, provider);
          return; // redirect will complete elsewhere
        }
        // If that Google account is already linked to a *different* Firebase user
        if (err.code === 'auth/credential-already-in-use') {
          setMsg({
            type: 'error',
            text: 'This Google account is already linked to another user.',
          });
          return;
        }
        throw err;
      }

      await reload(auth.currentUser!);
      setIsLinked(true);
      setMsg({
        type: 'success',
        text: 'Google successfully linked to your account.',
      });
    } catch (e: any) {
      console.error('[link google] error:', e);
      setMsg({ type: 'error', text: e?.message ?? 'Failed to link Google.' });
    } finally {
      setBusy(false);
    }
  };

  const unlinkNow = async () => {
    setMsg(null);
    setBusy(true);
    try {
      if (!auth.currentUser) throw new Error('Not signed in');

      // You cannot unlink the *last* sign-in method.
      // Require that user also has password provider before allowing unlink.
      if (!hasPasswordProvider()) {
        setMsg({
          type: 'error',
          text: 'Add a password to your account before unlinking Google.',
        });
        return;
      }

      await unlink(auth.currentUser, 'google.com');
      await reload(auth.currentUser);
      setIsLinked(false);
      setMsg({
        type: 'success',
        text: 'Google has been unlinked from your account.',
      });
    } catch (e: any) {
      const err = e as AuthError;
      if (err.code === 'auth/requires-recent-login') {
        setMsg({
          type: 'error',
          text: 'For security, please log in again and try unlinking.',
        });
      } else {
        setMsg({
          type: 'error',
          text: err.message ?? 'Failed to unlink Google.',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <GoogleIcon fontSize="small" />
        <Typography variant="subtitle1">Google</Typography>
        <Chip
          size="small"
          label={isLinked ? 'Linked' : 'Not linked'}
          color={isLinked ? 'success' : 'default'}
          variant={isLinked ? 'filled' : 'outlined'}
        />
      </Stack>

      {msg && (
        <Alert severity={msg.type} sx={{ mb: 2 }}>
          {msg.text}
        </Alert>
      )}

      <Stack direction="row" spacing={2}>
        {!isLinked ? (
          <Button
            variant="contained"
            startIcon={<LinkIcon />}
            onClick={linkNow}
            disabled={busy}
          >
            Link Google
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<LinkOffIcon />}
            onClick={unlinkNow}
            disabled={busy}
          >
            Unlink Google
          </Button>
        )}
      </Stack>

      {/* Small hint */}
      {!isLinked && (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mt={1}
        >
          We’ll open a Google window to link your account.
        </Typography>
      )}
    </Box>
  );
}
