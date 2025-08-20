import * as React from 'react';
import { Box } from '@mui/material';
import LoadingProgress from './LoadingProgress';

type Props = {
  /** ref from useInView: const { ref } = useInView() */
  sentinelRef: (node: Element | null) => void;
  hasMore: boolean;
};

export default function InfiniteSentinel({ sentinelRef, hasMore }: Props) {
  return (
    <Box ref={sentinelRef} display="flex" justifyContent="center" py={3}>
      {hasMore && <LoadingProgress />}
    </Box>
  );
}
