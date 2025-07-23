// components/SafeQuill.tsx
import React, { forwardRef } from 'react';
import ReactQuill, { ReactQuillProps } from 'react-quill';

// Forward the ref properly
const SafeQuill = forwardRef<ReactQuill, ReactQuillProps>((props, ref) => (
  <ReactQuill {...props} ref={ref} />
));
SafeQuill.displayName = 'SafeQuill';

export default SafeQuill;
