// apps/client/src/pages/admin/products/ProductFormPage.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Button,
  MenuItem,
  Divider,
  Paper,
} from '@mui/material';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';

import { useForm, Controller, useWatch } from 'react-hook-form';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { useProduct } from '../../../hooks/useProduct';
import { useCategories } from '../../../hooks/useCategories';
import { useSaveProductMutation } from '../../../hooks/useSaveProductMutation';

import FormTextField from '../../../components/FormTextField';
import ImageUploader, {
  CombinedImage,
} from '../../../components/ImageUploader';
import { useProductFormStore } from '../../../stores/useProductFormStore';
import { useSnackbar } from 'notistack';
import PageCard from '../../../layouts/PageCard';

// Firebase Storage helpers
import {
  getDownloadURL,
  uploadBytesResumable,
  ref as storageRef,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../../../firebase';

export type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
};

const MAX_IMAGES = 5;
type UploadableImage = CombinedImage & { file?: File };
export default function ProductFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { t, i18n } = useTranslation();
  const saveMutation = useSaveProductMutation();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const {
    combinedImages,
    isUploadingImages,
    categories,
    deletedImageIds,
    setProduct,
    setCombinedImages,
    setUploadingImages,
    setCategories,
    addCombinedImages,
    addDeletedImageId,
    setReady,
  } = useProductFormStore();

  const { data: productData, isLoading: productLoading } =
    useProduct(productId);
  const { data: categoryData = [], isLoading: categoriesLoading } =
    useCategories();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, errors, isDirty, isValid },
  } = useForm<FormState>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      price: '',
      stock: '',
      categoryId: '',
    },
  });

  const watchedCategoryId = useWatch({ control, name: 'categoryId' });

  const quillRef = useRef<ReactQuill | null>(null);
  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'blockquote', 'code-block'],
        ['clean'],
      ],
      clipboard: { matchVisual: false },
    }),
    [],
  );
  const quillFormats = useMemo(
    () => [
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'color',
      'background',
      'list',
      'bullet',
      'align',
      'link',
      'blockquote',
      'code-block',
    ],
    [],
  );

  useEffect(() => {
    const q = quillRef.current?.getEditor?.();
    if (q) q.enable(true);
  });

  // categories stable push
  const prevCatSigRef = useRef<string>('');
  useEffect(() => {
    const sig = JSON.stringify(categoryData.map((c) => c.id));
    if (sig !== prevCatSigRef.current) {
      setCategories(categoryData);
      prevCatSigRef.current = sig;
    }
  }, [categoryData, setCategories]);

  // bootstrap
  const bootstrappedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode === 'add') {
      if (bootstrappedForIdRef.current !== 'add') {
        reset({
          name: '',
          description: '',
          price: '',
          stock: '',
          categoryId: '',
        });
        setCombinedImages([]);
        setProduct(undefined);
        setReady(true);
        bootstrappedForIdRef.current = 'add';
      }
      return;
    }
    if (
      !productId ||
      productLoading ||
      categoriesLoading ||
      !productData ||
      categoryData.length === 0
    )
      return;
    if (bootstrappedForIdRef.current === productId) return;

    const {
      name = '',
      description = '',
      price = 0,
      stock = 0,
      categoryId = '',
      images = [],
    } = productData;

    const validCategoryId = categoryData.some((c) => c.id === categoryId)
      ? categoryId
      : '';

    reset({
      name,
      description,
      price: String(price ?? ''),
      stock: String(stock ?? ''),
      categoryId: validCategoryId,
    });

    const formattedImages: CombinedImage[] = Array.isArray(images)
      ? images.map((url) => ({ id: `existing-${url}`, url, type: 'existing' }))
      : [];

    setProduct(productData);
    setCombinedImages(formattedImages);
    setReady(true);
    bootstrappedForIdRef.current = productId;
  }, [
    mode,
    productId,
    productLoading,
    categoriesLoading,
    productData,
    categoryData,
    reset,
    setProduct,
    setCombinedImages,
    setReady,
  ]);

  const handleImageDrop = (files: File[]) => {
    if (!files?.length) return;
    const allowed = Math.max(0, MAX_IMAGES - combinedImages.length);
    const useFiles = files.slice(0, allowed);
    const timestamp = Date.now();

    const newImages: UploadableImage[] = useFiles.map((file, idx) => ({
      id: `${file.name}-${timestamp}-${idx}`,
      url: URL.createObjectURL(file),
      type: 'new',
      file,
      progress: 0,
    }));

    if (newImages.length) addCombinedImages(newImages);
  };

  // ---------- upload + delete helpers ----------
  const sanitizeName = (name: string) => name.replace(/[^\w.-]+/g, '_');

  const uploadFileGetUrl = async (
    file: File,
    docIdForPath: string | undefined,
  ): Promise<string> => {
    const clean = sanitizeName(file.name);
    const path = `products/${docIdForPath ?? 'misc'}/${Date.now()}_${clean}`;
    const ref = storageRef(storage, path);
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(ref, file, { contentType: file.type });
      task.on('state_changed', undefined, reject, () => resolve());
    });
    return await getDownloadURL(ref);
  };

  const deleteByUrlIfPossible = async (url: string) => {
    try {
      const pathMatch = url.match(/\/o\/([^?]+)/);
      const objectPath = pathMatch ? decodeURIComponent(pathMatch[1]) : url;
      const ref = storageRef(storage, objectPath);
      await deleteObject(ref);
    } catch (e) {
      console.warn('[storage] delete skip:', e);
    }
  };
  // --------------------------------------------

  const onSubmit = async (formData: FormState) => {
    try {
      setUploadingImages(true);

      // ... build finalUrls, delete removed, saveMutation ...

      enqueueSnackbar(
        t('adminProductForm.savedOk', {
          defaultValue: 'Product saved successfully!',
        }) as string,
        { variant: 'success', autoHideDuration: 3000 },
      );

      navigate('/admin/products');
    } catch (err) {
      console.error('❌ Failed to save product:', err);

      enqueueSnackbar(
        t('adminProductForm.saveFailed', {
          defaultValue: 'Failed to save product. Check console for details.',
        }) as string,
        { variant: 'error', autoHideDuration: 5000 },
      );
    } finally {
      setUploadingImages(false);
    }
  };

  const isReady =
    mode === 'add'
      ? !categoriesLoading
      : !productLoading && !categoriesLoading && !!productData;

  if (!isReady) {
    return (
      <Box p={3}>
        <Typography>
          {t('adminProductForm.loading', {
            defaultValue: 'Loading product or categories...',
          })}
        </Typography>
      </Box>
    );
  }

  const imagesRemaining = Math.max(0, MAX_IMAGES - combinedImages.length);
  const isRtl = i18n.dir() === 'rtl';

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <PageCard variant="form" pad={{ xs: 3, sm: 3.5, md: 4 }}>
        <Stack spacing={2.5}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.5 }}
          >
            <Typography variant="h5" fontWeight={700}>
              {mode === 'add'
                ? t('adminProductForm.titleAdd', {
                    defaultValue: 'Add New Product',
                  })
                : t('adminProductForm.titleEdit', {
                    defaultValue: 'Edit Product',
                  })}
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                disabled={isSubmitting || isUploadingImages}
              >
                {t('actions.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                type="submit"
                form="product-form"
                variant="contained"
                disabled={
                  isSubmitting || isUploadingImages || !isValid || !isDirty
                }
              >
                {t('actions.save', { defaultValue: 'Save' })}
              </Button>
            </Stack>
          </Stack>

          <Divider />

          {/* FORM: force a new BFC and use gap to avoid margin-collapse */}
          <Box
            component="form"
            id="product-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            dir={isRtl ? 'rtl' : 'ltr'}
            sx={{
              overflow: 'auto', // new block formatting context
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5, // spacing without margins
              pb: 2, // comfy bottom padding
              width: '100%',
            }}
          >
            <FormTextField
              label={t('adminProductForm.category', {
                defaultValue: 'Category',
              })}
              name="categoryId"
              control={control}
              errorObject={errors.categoryId}
              select
              required
              fullWidth
              margin="normal"
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </FormTextField>

            {!categories.some((c) => c.id === watchedCategoryId) &&
              watchedCategoryId && (
                <Typography color="error" sx={{ mt: 0.5 }}>
                  {t('adminProductForm.invalidCategory', {
                    id: watchedCategoryId,
                    defaultValue: 'Invalid category ID: {{id}}',
                  })}
                </Typography>
              )}

            <FormTextField
              autoFocus
              label={t('adminProductForm.name', { defaultValue: 'Name' })}
              register={register('name', {
                required: t('validation.name_required', {
                  defaultValue: 'Name is required.',
                }) as string,
                minLength: {
                  value: 2,
                  message: t('validation.min2', {
                    defaultValue: 'Too short',
                  }) as string,
                },
              })}
              errorObject={errors.name}
              fullWidth
              margin="normal"
            />

            {/* Description (Quill) */}
            <Controller
              control={control}
              name="description"
              defaultValue=""
              render={({ field }) => (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle1" mb={1} fontWeight={600}>
                    {t('adminProductForm.description', {
                      defaultValue: 'Description',
                    })}
                  </Typography>

                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      '& .ql-toolbar': {
                        bgcolor: 'background.paper',
                        borderBottom: 1,
                        borderColor: 'divider',
                      },
                      '& .ql-container': {
                        bgcolor: 'background.default',
                        color: 'text.primary',
                        minHeight: 200,
                      },
                      '& .ql-editor': {
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        px: 2,
                        py: 1.25,
                        minHeight: 200,
                      },
                    }}
                  >
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={field.value}
                      onChange={field.onChange}
                      readOnly={false}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder={
                        t('adminProductForm.descriptionPlaceholder', {
                          defaultValue:
                            'Write a short, attractive description…',
                        }) as string
                      }
                    />
                  </Paper>
                </Box>
              )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
              <FormTextField
                label={t('adminProductForm.price', { defaultValue: 'Price' })}
                type="number"
                fullWidth
                register={register('price', {
                  required: t('validation.price_required', {
                    defaultValue: 'Price is required.',
                  }) as string,
                  validate: (v) =>
                    Number(v) >= 0 ||
                    (t('validation.nonnegative', {
                      defaultValue: 'Must be ≥ 0',
                    }) as string),
                })}
                errorObject={errors.price}
                margin="normal"
              />
              <FormTextField
                label={t('adminProductForm.stock', { defaultValue: 'Stock' })}
                type="number"
                fullWidth
                register={register('stock', {
                  validate: (v) =>
                    v === '' ||
                    Number(v) >= 0 ||
                    (t('validation.nonnegative', {
                      defaultValue: 'Must be ≥ 0',
                    }) as string),
                })}
                errorObject={errors.stock}
                margin="normal"
              />
            </Stack>

            {/* Images */}
            <Box>
              <Typography variant="subtitle1" mb={1.25} fontWeight={600}>
                {t('adminProductForm.images', { defaultValue: 'Images' })}
              </Typography>

              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 0, // ← avoid double dashed borders; uploader shows the dashed area
                  bgcolor: 'background.paper',
                }}
              >
                <ImageUploader
                  images={combinedImages}
                  onDrop={handleImageDrop}
                  onRemove={(id) => {
                    const imageToDelete = combinedImages.find(
                      (img) => img.id === id,
                    );
                    if (imageToDelete?.type === 'existing') {
                      addDeletedImageId(
                        imageToDelete.id.replace('existing-', ''),
                      );
                    }
                    setCombinedImages(
                      combinedImages.filter((img) => img.id !== id),
                    );
                  }}
                  onReorderAll={(newOrder) => setCombinedImages(newOrder)}
                  showSnackbar={false}
                  onCloseSnackbar={() => {
                    //todo
                  }}
                  singleHeight={240}
                  withinCard
                  maxImages={MAX_IMAGES}
                  containerSx={{
                    m: 0,
                    width: '100%',
                    bgcolor: 'transparent',
                  }}
                />

                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 1, opacity: 0.8 }}
                >
                  {t('adminProductForm.imagesHint', {
                    defaultValue:
                      'Drag or click to upload (max 5MB each). Slots remaining: {{count}}',
                    count: imagesRemaining,
                  })}
                </Typography>
              </Paper>
            </Box>

            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                disabled={isSubmitting || isUploadingImages}
              >
                {t('actions.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || isUploadingImages || !isValid}
              >
                {t('actions.save', { defaultValue: 'Save' })}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </PageCard>
    </PageLayout>
  );
}
