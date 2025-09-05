import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Stack, Button, MenuItem } from '@mui/material';
import { PageLayout } from '../../../layouts/page.layout';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';
import { useTranslation } from 'react-i18next';

import { useForm, Controller, useWatch } from 'react-hook-form';
import ReactQuill from 'react-quill';
import { useProduct } from '../../../hooks/useProduct';
import { useCategories } from '../../../hooks/useCategories';
import { useSaveProductMutation } from '../../../hooks/useSaveProductMutation';

import FormTextField from '../../../components/FormTextField';
import ImageUploader, {
  CombinedImage,
} from '../../../components/ImageUploader';
import { useProductFormStore } from '../../../stores/useProductFormStore';

import PageCard from '../../../layouts/PageCard';

// ✅ Firebase Storage helpers
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

export default function ProductFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { t } = useTranslation();
  const saveMutation = useSaveProductMutation();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

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
    formState: { isSubmitting, errors },
  } = useForm<FormState>({
    defaultValues: {
      name: '',
      description: '',
      price: '',
      stock: '',
      categoryId: '',
    },
  });

  const watchedCategoryId = useWatch({ control, name: 'categoryId' });

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
    const timestamp = Date.now();
    const newImages: CombinedImage[] = files.map((file, idx) => ({
      id: `${file.name}-${timestamp}-${idx}`,
      url: URL.createObjectURL(file),
      type: 'new',
      file,
      progress: 0,
    }));
    addCombinedImages(newImages);
  };

  // ---------- upload + delete helpers ----------
  const sanitizeName = (name: string) => name.replace(/[^\w.-]+/g, '_');

  const uploadFileGetUrl = async (
    file: File,
    docIdForPath: string | undefined,
  ): Promise<string> => {
    const clean = sanitizeName(file.name);
    // use productId for nice organization; fallback to generic folder
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
      // Works with both "gs://" and "https://firebasestorage.googleapis.com/..." URLs
      const pathMatch = url.match(/\/o\/([^?]+)/);
      const objectPath = pathMatch ? decodeURIComponent(pathMatch[1]) : url;
      const ref = storageRef(storage, objectPath);
      await deleteObject(ref);
    } catch (e) {
      // Non-fatal; log and continue
      console.warn('[storage] delete skip:', e);
    }
  };
  // --------------------------------------------

  const onSubmit = async (formData: FormState) => {
    try {
      setUploadingImages(true);

      // 1) Build final ordered URLs
      const finalUrls: string[] = [];
      for (const img of combinedImages) {
        if (img.type === 'existing') {
          finalUrls.push(img.url);
        } else if (img.type === 'new' && img.file) {
          const url = await uploadFileGetUrl(img.file, productId);
          finalUrls.push(url);
        }
      }

      // 2) Physically delete removed images (optional but recommended)
      for (const url of deletedImageIds) {
        await deleteByUrlIfPossible(url);
      }

      // 3) Persist to API with clean string[] images
      await saveMutation.mutateAsync({
        productId,
        mode,
        data: {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock),
        },
        // 👇 send only strings, not blobs / wrappers
        images: finalUrls,
        // you can drop this if server no longer needs it
        imageUrl: finalUrls[0] ?? null, // optional main image
        deletedImageIds,
      });

      alert(
        t('adminProductForm.savedOk', {
          defaultValue: 'Product saved successfully!',
        }),
      );
      navigate('/admin/products');
    } catch (err) {
      console.error('❌ Failed to save product:', err);
      alert(
        t('adminProductForm.saveFailed', {
          defaultValue: 'Failed to save product. Check console for details.',
        }),
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

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <PageCard variant="form" pad={{ xs: 3, sm: 3.5, md: 4 }}>
        <Stack spacing={2.5}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
            {mode === 'add'
              ? t('adminProductForm.titleAdd', {
                  defaultValue: 'Add New Product',
                })
              : t('adminProductForm.titleEdit', {
                  defaultValue: 'Edit Product',
                })}
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <FormTextField
                label={t('adminProductForm.name', { defaultValue: 'Name' })}
                register={register('name', {
                  required: t('validation.name_required', {
                    defaultValue: 'Name is required.',
                  }) as string,
                })}
                errorObject={errors.name}
                fullWidth
                margin="normal"
              />

              <Controller
                control={control}
                name="description"
                defaultValue=""
                render={({ field }) => (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle1" mb={1}>
                      {t('adminProductForm.description', {
                        defaultValue: 'Description',
                      })}
                    </Typography>
                    <Box
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
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
                        },
                      }}
                    >
                      <ReactQuill
                        theme="snow"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </Box>
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
                  })}
                  errorObject={errors.price}
                  margin="normal"
                />
                <FormTextField
                  label={t('adminProductForm.stock', { defaultValue: 'Stock' })}
                  type="number"
                  fullWidth
                  register={register('stock')}
                  errorObject={errors.stock}
                  margin="normal"
                />
              </Stack>

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

              <Box>
                <Typography variant="subtitle1" mb={1.25}>
                  {t('adminProductForm.images')}
                </Typography>
                <ImageUploader
                  images={combinedImages}
                  onDrop={handleImageDrop}
                  onRemove={(id) => {
                    const imageToDelete = combinedImages.find(
                      (img) => img.id === id,
                    );
                    if (imageToDelete?.type === 'existing') {
                      // store the raw URL so we can delete from Storage later
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
                  onCloseSnackbar={() => {}}
                />
              </Box>

              <Box textAlign="right">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || isUploadingImages}
                >
                  {t('actions.save', { defaultValue: 'Save' })}
                </Button>
              </Box>
            </Stack>
          </form>
        </Stack>
      </PageCard>
    </PageLayout>
  );
}
