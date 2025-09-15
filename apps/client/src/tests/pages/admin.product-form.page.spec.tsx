import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import * as React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import user from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// ─────────────────────────────────────────────────────────────────────────────
// Polyfills (jsdom)
// ─────────────────────────────────────────────────────────────────────────────
beforeAll(() => {
  // jsdom doesn't implement these; provide stable fallbacks for tests.
  if (!('URL' in globalThis)) (globalThis as any).URL = {} as any;
  if (!('createObjectURL' in URL)) {
    (URL as any).createObjectURL = () => 'blob:mock-object-url';
  }
  if (!('revokeObjectURL' in URL)) {
    (URL as any).revokeObjectURL = () => {
      /* no-op */
    };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

// Layout passthrough
vi.mock('../../layouts/page.layout', () => ({
  PageLayout: ({ children }: any) => <>{children}</>,
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

// PageCard passthrough
vi.mock('../../layouts/PageCard', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="page-card">{children}</div>,
}));

// i18n passthrough
vi.mock('../../i18n', () => ({}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, o?: any) => o?.defaultValue ?? o ?? _k,
    i18n: { dir: () => 'ltr' },
  }),
  Trans: ({ children }: any) => (
    <>{typeof children === 'function' ? children('') : children}</>
  ),
  __esModule: true,
}));

// ReactQuill -> simple textarea
vi.mock('react-quill', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref) => (
      <textarea
        aria-label="quill"
        value={props.value || ''}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    )),
    Quill: {},
  };
});

// notistack
const enqueueSnackbarMock = vi.fn();
vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: enqueueSnackbarMock }),
  SnackbarProvider: ({ children }: any) => <>{children}</>,
  __esModule: true,
}));

// Router helpers
const navigateMock = vi.fn();
let paramsMock: Record<string, string | undefined> = {};
vi.mock('react-router-dom', async (orig) => {
  const real = (await orig()) ?? {};
  return {
    ...(typeof real === 'object' && real !== null ? real : {}),
    useNavigate: () => navigateMock,
    useParams: () => paramsMock,
  };
});

// Hooks under test
type Category = { id: string; name: string };
let categoriesMock: Category[] = [];
let categoriesLoadingMock = false;
vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    data: categoriesMock,
    isLoading: categoriesLoadingMock,
  }),
  __esModule: true,
}));

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  images?: string[];
};
let productMock: Product | undefined;
let productLoadingMock = false;
vi.mock('../../hooks/useProduct', () => ({
  useProduct: () => ({
    data: productMock,
    isLoading: productLoadingMock,
  }),
  __esModule: true,
}));

// Save mutation
const mutateAsyncMock = vi.fn();
vi.mock('../../hooks/useSaveProductMutation', () => ({
  useSaveProductMutation: () => ({
    mutateAsync: mutateAsyncMock,
  }),
  __esModule: true,
}));

// ProductForm store
// Keep minimal state/ops used by the page.
const storeState = {
  combinedImages: [] as any[],
  isUploadingImages: false,
  categories: [] as Category[],
  deletedImageIds: [] as string[],
};
const setProductMock = vi.fn((p?: any) => p);
const setCombinedImagesMock = vi.fn((imgs: any[]) => {
  storeState.combinedImages = imgs;
});
const setUploadingImagesMock = vi.fn((v: boolean) => {
  storeState.isUploadingImages = v;
});
const setCategoriesMock = vi.fn((cats: Category[]) => {
  storeState.categories = cats;
});
const addCombinedImagesMock = vi.fn((imgs: any[]) => {
  storeState.combinedImages = [...storeState.combinedImages, ...imgs];
});
const addDeletedImageIdMock = vi.fn((id: string) => {
  storeState.deletedImageIds.push(id);
});
const setReadyMock = vi.fn();

vi.mock('../../stores/useProductFormStore', () => ({
  useProductFormStore: () => ({
    ...storeState,
    setProduct: setProductMock,
    setCombinedImages: setCombinedImagesMock,
    setUploadingImages: setUploadingImagesMock,
    setCategories: setCategoriesMock,
    addCombinedImages: addCombinedImagesMock,
    addDeletedImageId: addDeletedImageIdMock,
    setReady: setReadyMock,
  }),
  __esModule: true,
}));

// FormTextField mock
import { Controller } from 'react-hook-form';
vi.mock('../../components/FormTextField', () => ({
  __esModule: true,
  default: (props: any) => {
    // Controller + SELECT mode
    if (props.control && props.name) {
      const childrenAsOptions = React.Children.toArray(props.children).map(
        // children are MUI <MenuItem value="...">Label</MenuItem>
        (child: any, i: number) => {
          const value = child?.props?.value ?? '';
          const label =
            typeof child?.props?.children === 'string'
              ? child.props.children
              : String(child?.props?.children ?? '');
          return (
            <option key={i} value={value}>
              {label}
            </option>
          );
        },
      );

      return (
        <Controller
          control={props.control}
          name={props.name}
          defaultValue=""
          render={({ field }) => (
            <label>
              {props.label}
              <select
                aria-label={String(props.label)}
                data-testid={props.name}
                {...field}
              >
                <option value="" />
                {childrenAsOptions}
              </select>
            </label>
          )}
        />
      );
    }

    // registered INPUT mode
    const reg = props.register || {};
    return (
      <label>
        {props.label}
        <input
          aria-label={String(props.label)}
          type={props.type || 'text'}
          {...reg}
        />
      </label>
    );
  },
}));

// ImageUploader mock: render current images and expose Drop/Remove triggers
let lastImageUploaderProps: any = null;
vi.mock('../../components/ImageUploader', () => ({
  __esModule: true,
  default: (props: any) => {
    lastImageUploaderProps = props;
    return (
      <div>
        <ul data-testid="images-list">
          {(props.images || []).map((img: any) => (
            <li key={img.id}>
              <span>{img.id}</span>
              <button
                aria-label={`remove-${img.id}`}
                onClick={() => props.onRemove?.(img.id)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
        <button
          aria-label="drop-one-image"
          onClick={() => {
            const f = new File(['x'], 'pic.png', { type: 'image/png' });
            props.onDrop?.([f]);
          }}
        >
          drop
        </button>
      </div>
    );
  },
}));

// SUT import helper
async function renderSut(mode: 'add' | 'edit') {
  const { default: ProductFormPage } = await import(
    '../../pages/admin/AdminProductFormPage/ProductFormPage'
  );
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider theme={createTheme()}>
        <Routes>
          <Route path="/" element={<ProductFormPage mode={mode} />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ProductFormPage', () => {
  beforeEach(() => {
    // reset env
    categoriesMock = [{ id: 'cat1', name: 'Cat 1' }];
    categoriesLoadingMock = false;
    productMock = undefined;
    productLoadingMock = false;
    paramsMock = {};

    Object.assign(storeState, {
      combinedImages: [],
      isUploadingImages: false,
      categories: [],
      deletedImageIds: [],
    });

    enqueueSnackbarMock.mockReset();
    navigateMock.mockReset();
    mutateAsyncMock.mockReset();

    setProductMock.mockClear();
    setCombinedImagesMock.mockClear();
    setUploadingImagesMock.mockClear();
    setCategoriesMock.mockClear();
    addCombinedImagesMock.mockClear();
    addDeletedImageIdMock.mockClear();
    setReadyMock.mockClear();
  });

  it('add mode: fills form, drops image, saves -> calls mutation and navigates', async () => {
    const u = user.setup();
    await renderSut('add');

    // Category select
    const cat = await screen.findByTestId('categoryId');
    await u.selectOptions(cat, 'cat1');

    // Name, Price, Stock
    await u.type(screen.getByLabelText(/name/i), 'Prod Name');
    await u.type(screen.getByLabelText(/price/i), '9');
    await u.type(screen.getByLabelText(/stock/i), '5');

    // Description (quill mock)
    await u.type(screen.getByLabelText('quill'), 'Cool product');

    // Drop an image
    await u.click(screen.getByRole('button', { name: /drop-one-image/i }));

    // Save
    const save = screen.getAllByRole('button', { name: /save/i })[0];
    await u.click(save);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const payload = mutateAsyncMock.mock.calls[0][0];
    expect(payload.mode).toBe('add');
    expect(payload.productId).toBeUndefined();
    expect(payload.data).toEqual({
      name: 'Prod Name',
      description: 'Cool product',
      price: 9,
      stock: 5,
      categoryId: 'cat1',
    });
    // 1 new image with a File present
    expect(Array.isArray(payload.images)).toBe(true);
    expect(payload.images.length).toBe(1);
    const img0 = payload.images[0];
    expect(img0.type).toBe('new');
    expect(img0.file).toBeInstanceOf(File);
    // no deleted images in add
    expect(payload.deletedImageIds).toEqual([]);

    // Success snackbar + navigate to list
    await waitFor(() => {
      expect(enqueueSnackbarMock).toHaveBeenCalledWith(
        expect.stringMatching(/saved/i),
        expect.objectContaining({ variant: 'success' }),
      );
      expect(navigateMock).toHaveBeenCalledWith('/admin/products');
    });
  });

  it('invalid category: warns and does not save', async () => {
    const u = user.setup();
    // No categories available
    categoriesMock = [];
    await renderSut('add');

    const cat = await screen.findByTestId('categoryId');
    // Force a bogus value
    await u.selectOptions(cat, '');

    await u.type(screen.getByLabelText(/name/i), 'AA');
    await u.type(screen.getByLabelText(/price/i), '0');

    const save = screen.getAllByRole('button', { name: /save/i })[0];
    await u.click(save);

    await waitFor(() => {
      expect(enqueueSnackbarMock).toHaveBeenCalledWith(
        expect.stringMatching(/valid category/i),
        expect.objectContaining({ variant: 'warning' }),
      );
    });
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('edit mode: bootstraps existing images and records deletedImageIds when removing', async () => {
    // Prepare an existing product
    productMock = {
      id: 'p123',
      name: 'Old',
      description: 'Old desc',
      price: 12,
      stock: 3,
      categoryId: 'cat1',
      images: ['https://cdn/x/a.jpg', 'https://cdn/x/b.jpg'],
    };
    paramsMock = { productId: 'p123' };

    const u = user.setup();
    await renderSut('edit');

    // Existing images should be in store, surfaced through ImageUploader
    const list = await screen.findByTestId('images-list');
    const items = within(list).getAllByRole('listitem');
    expect(items.length).toBe(2);

    // Remove first image — component passes id "existing-<url>"
    const firstIdText = within(items[0]).getByText(/existing-/i).textContent!;
    await u.click(
      within(items[0]).getByRole('button', { name: `remove-${firstIdText}` }),
    );

    // Expect that addDeletedImageId was called with raw URL (prefix stripped)
    expect(addDeletedImageIdMock).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/cdn\/x\/a\.jpg$/),
    );
  });

  it('shows loading gate until data ready', async () => {
    categoriesLoadingMock = true;
    await renderSut('add');
    expect(
      screen.getByText(/loading product or categories/i),
    ).toBeInTheDocument();
  });

  it('cancel button navigates back', async () => {
    const u = user.setup();
    await renderSut('add');

    const cancel = screen.getAllByRole('button', { name: /cancel/i })[0];
    await u.click(cancel);
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });
});
