import {
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  vi,
  type MockedFunction,
} from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// -------------------- Mocks (hoisted) --------------------
vi.mock('../../hooks/useLandingPage', async () => {
  // preserve types
  const actual = await vi.importActual<
    typeof import('../../hooks/useLandingPage')
  >('../../hooks/useLandingPage');
  return {
    ...actual,
    useLandingPage: vi.fn(),
    useUpdateLandingPage: vi.fn(),
  };
});

vi.mock('../../layouts/page.layout', () => ({
  __esModule: true,
  PageLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; [k: string]: unknown }) =>
      opts?.defaultValue ?? key,
    i18n: { language: 'en' },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  initReactI18next: {
    type: '3rdParty',
    init: () => {
      // noop
    },
  },
}));

// We don't need an actual cropper; trigger callbacks via buttons.
vi.mock('../../components/PictureUploaderWithCrop', () => ({
  __esModule: true,
  default: ({
    avatarUrl,
    onCropUpload,
    onDeleteAvatar,
    disabled,
  }: {
    avatarUrl?: string;
    onCropUpload: (file: File) => void | Promise<void>;
    onDeleteAvatar: () => void;
    disabled?: boolean;
  }) => (
    <div>
      <div data-testid="banner-preview">{avatarUrl ?? ''}</div>
      <button
        type="button"
        onClick={() =>
          onCropUpload(new File(['img'], 'banner.jpg', { type: 'image/jpeg' }))
        }
        disabled={disabled}
      >
        Mock Upload
      </button>
      <button type="button" onClick={onDeleteAvatar} disabled={disabled}>
        Mock Delete
      </button>
    </div>
  ),
}));

// Firebase storage helpers are used in the component; stub to stable behavior.
vi.mock('firebase/storage', () => {
  const getStorage = vi.fn((_app?: unknown, _bucket?: string) => ({
    __mock: 'storage',
  }));

  const ref = vi.fn((_storage: unknown, path: string) => ({ fullPath: path }));

  const uploadBytesResumable = vi.fn(() => {
    const task = {
      on: (
        _ev: string,
        _p?: unknown,
        _err?: (e: unknown) => void,
        complete?: () => void,
      ) => {
        // complete immediately
        complete?.();
      },
      snapshot: { ref: { fullPath: 'landing/banner_123.jpg' } },
    };
    return task as unknown as import('firebase/storage').UploadTask;
  });

  const getDownloadURL = vi.fn(
    async () => 'https://storage.mock/landing/banner_123.jpg',
  );

  // no-op in tests; include for firebase.ts compatibility
  const connectStorageEmulator = vi.fn();

  return {
    __esModule: true,
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    connectStorageEmulator,
  };
});

// -------------------- Imports (after mocks) --------------------
import * as landingHooks from '../../hooks/useLandingPage';
import { HOMEPAGE_LAYOUTS, type LandingPageData } from '@common/types';

// util: render with providers
function renderWithProviders(
  ui: React.ReactElement,
  initialEntry = '/admin/landing',
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider theme={createTheme()}>
        <SnackbarProvider maxSnack={3}>
          <QueryClientProvider client={client}>{ui}</QueryClientProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

// dynamic import so Vite resolves the file correctly
async function loadPage() {
  const mod = await import(
    '../../pages/admin/AdminLandingPage/AdminLandingPage'
  );
  return mod.default as React.ComponentType;
}

// typed handles to mocked hooks
type UseLandingPageFn = typeof landingHooks.useLandingPage;
type UseUpdateLandingPageFn = typeof landingHooks.useUpdateLandingPage;

const useLandingPageMock =
  landingHooks.useLandingPage as unknown as MockedFunction<UseLandingPageFn>;
const useUpdateLandingPageMock =
  landingHooks.useUpdateLandingPage as unknown as MockedFunction<UseUpdateLandingPageFn>;

// default server payload
const serverData: LandingPageData = {
  title: 'Welcome to Bunder Shop',
  subtitle: 'Your one-stop e-commerce store',
  bannerImageUrl: 'https://storage.mock/landing/seed.jpg',
  ctaButtonText: 'Shop Now',
  ctaButtonLink: '/products',
  homepageLayout: HOMEPAGE_LAYOUTS.Hero,
  sections: [
    {
      title: 'Featured Deals',
      content: 'Check out our daily deals on popular products.',
    },
  ],
  bentoCards: [
    { title: 'Free shipping', body: 'On orders over $99' },
    { title: '24/7 support', body: 'We’re here anytime' },
    { title: 'Eco materials', body: 'Consciously sourced' },
    { title: '4.9 ★', body: '2,400+ reviews' },
    { title: 'New drops', body: 'Every Friday 10:00' },
    { title: 'Secure checkout', body: 'PayPal secured' },
  ],
};

let mutateAsyncSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsyncSpy = vi.fn(async (payload: LandingPageData) => payload);

  useUpdateLandingPageMock.mockReturnValue({
    mutateAsync: mutateAsyncSpy,
    status: 'idle',
  } as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AdminLandingPage', () => {
  it('shows loading gate', async () => {
    useLandingPageMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);
    const Page = await loadPage();

    renderWithProviders(
      <Routes>
        <Route path="/admin/landing" element={<Page />} />
      </Routes>,
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    useLandingPageMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);
    const Page = await loadPage();

    renderWithProviders(
      <Routes>
        <Route path="/admin/landing" element={<Page />} />
      </Routes>,
    );

    expect(
      await screen.findByText(/Failed to load landing page data/i),
    ).toBeInTheDocument();
  });

  it('renders data, edits fields, adds/removes sections & cards, saves once', async () => {
    useLandingPageMock.mockReturnValue({
      data: serverData,
      isLoading: false,
      isError: false,
    } as any);
    const Page = await loadPage();

    renderWithProviders(
      <Routes>
        <Route path="/admin/landing" element={<Page />} />
      </Routes>,
    );

    // Title change (label may render as "Title *" -> allow optional asterisk/space)
    const title = await screen.findByLabelText(/^\s*Title(\s*[*])?\s*$/i);
    fireEvent.change(title, { target: { value: 'Updated Title' } });

    // Subtitle change (exact-ish)
    const subtitle = screen.getByLabelText(/^\s*Subtitle\s*$/i);
    fireEvent.change(subtitle, { target: { value: 'New subtitle' } });

    // CTA text/link
    fireEvent.change(screen.getByLabelText(/^\s*CTA Button Text\s*$/i), {
      target: { value: 'Buy Now' },
    });
    fireEvent.change(screen.getByLabelText(/^\s*CTA Button Link\s*$/i), {
      target: { value: '/sale' },
    });

    // Layout select (open the MUI Select and pick a value)
    const layout = screen.getByLabelText(/^\s*Homepage Layout\s*$/i);
    fireEvent.mouseDown(layout);
    const opt = await screen.findByRole('option', { name: /Hero/i });
    fireEvent.click(opt);

    // Sections: add & remove
    fireEvent.click(screen.getByRole('button', { name: /add section/i }));
    // Fill the new section fields
    const sectionTitles = screen.getAllByLabelText(/^\s*Section Title\s*$/i);
    const sectionBodies = screen.getAllByLabelText(/^\s*Section Content\s*$/i);
    fireEvent.change(sectionTitles.at(-1)!, {
      target: { value: 'More Picks' },
    });
    fireEvent.change(sectionBodies.at(-1)!, {
      target: { value: 'Fresh arrivals' },
    });

    // Remove the first section
    const deleteSectionButtons = screen.getAllByRole('button', {
      name: /delete/i,
    });
    fireEvent.click(deleteSectionButtons[0]);

    // Cards: add & remove
    fireEvent.click(screen.getByRole('button', { name: /add card/i }));
    const cardTitles = screen.getAllByLabelText(/^\s*Card Title\s*$/i);
    const cardBodies = screen.getAllByLabelText(/^\s*Card Body\s*$/i);
    fireEvent.change(cardTitles.at(-1)!, { target: { value: 'Warranty' } });
    fireEvent.change(cardBodies.at(-1)!, { target: { value: '2 years' } });

    // Remove one card (use the next delete button found after sections’ one)
    const deleteButtonsAll = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtonsAll.at(-1)!);

    // Save
    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(mutateAsyncSpy).toHaveBeenCalledTimes(1));
    const sent = mutateAsyncSpy.mock.calls[0][0] as LandingPageData;

    expect(sent.title).toBe('Updated Title');
    expect(sent.subtitle).toBe('New subtitle');
    expect(sent.ctaButtonText).toBe('Buy Now');
    expect(sent.ctaButtonLink).toBe('/sale');
    expect(Object.values(HOMEPAGE_LAYOUTS)).toContain(sent.homepageLayout);
    expect(Array.isArray(sent.sections)).toBe(true);
    expect(Array.isArray(sent.bentoCards)).toBe(true);
  });

  it('handles banner upload and delete', async () => {
    useLandingPageMock.mockReturnValue({
      data: { ...serverData, bannerImageUrl: '' },
      isLoading: false,
      isError: false,
    } as any);
    const Page = await loadPage();

    renderWithProviders(
      <Routes>
        <Route path="/admin/landing" element={<Page />} />
      </Routes>,
    );

    // Upload via mocked cropper
    fireEvent.click(screen.getByRole('button', { name: /mock upload/i }));

    // After upload it should update preview (value comes from mocked getDownloadURL)
    await waitFor(() =>
      expect(screen.getByTestId('banner-preview').textContent).toContain(
        'https://storage.mock/landing/banner_123.jpg',
      ),
    );

    // Delete resets the preview
    fireEvent.click(screen.getByRole('button', { name: /mock delete/i }));
    await waitFor(() =>
      expect(screen.getByTestId('banner-preview').textContent).toBe(''),
    );
  });

  it('disables save while saving', async () => {
    useLandingPageMock.mockReturnValue({
      data: serverData,
      isLoading: false,
      isError: false,
    } as any);

    // Return a "pending" status during the interaction
    useUpdateLandingPageMock.mockReturnValue({
      mutateAsync: mutateAsyncSpy.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({} as any), 50)),
      ),
      status: 'pending',
    } as any);

    const Page = await loadPage();

    renderWithProviders(
      <Routes>
        <Route path="/admin/landing" element={<Page />} />
      </Routes>,
    );

    // Button label switches to "Saving..." when status is pending
    const saveBtn = await screen.findByRole('button', { name: /saving/i });
    expect(saveBtn).toBeDisabled();
  });
});
