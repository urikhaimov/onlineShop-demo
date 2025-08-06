import React, { useEffect, useRef } from 'react';
import { Box, Typography, Paper, Stack, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import ReactQuill from 'react-quill';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { storage } from '../../../firebase';
import { useProduct } from '../../../hooks/useProduct';
import { useCategories } from '../../../hooks/useCategories';
import { useSaveProductMutation } from '../../../hooks/useSaveProductMutation';

import FormTextField from '../../../components/FormTextField';
import ImageUploader, {
  CombinedImage,
} from '../../../components/ImageUploader';
import { useProductFormStore } from '../../../stores/useProductFormStore';
import { PageLayout } from '../../../layouts/page.layout';
import { headerHeight, footerHeight } from '../../../config/themeConfig';
import {
  EAbilityActions,
  EAbilitySubjects,
} from '../../../services/ability.service';

export type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
};

export default function ProductFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const saveMutation = useSaveProductMutation();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const hasResetOnce = useRef(false);

  const {
    product,
    combinedImages,
    isUploadingImages,
    categories,
    deletedImageIds,
    ready,
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
    watch,
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

  const isReady =
    mode === 'add'
      ? !categoriesLoading
      : !productLoading &&
        !categoriesLoading &&
        productData &&
        categoryData.length > 0;

  useEffect(() => {
    setCategories(categoryData);
  }, [categoryData, setCategories]);

  useEffect(() => {
    if (!productData || categoryData.length === 0 || hasResetOnce.current)
      return;

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
      price: price.toString(),
      stock: stock.toString(),
      categoryId: validCategoryId,
    });

    const formattedImages: CombinedImage[] = Array.isArray(images)
      ? images.map((url) => ({
          id: `existing-${url}`,
          url,
          type: 'existing',
        }))
      : [];

    setProduct(productData);
    setCombinedImages(formattedImages);
    setReady(true);
    hasResetOnce.current = true;
  }, [productData, categoryData]);

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

  const onSubmit = async (formData: FormState) => {
    try {
      setUploadingImages(true);

      const payload = {
        productId,
        mode,
        data: {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock),
        },
        images: combinedImages,
        deletedImageIds,
      };

      await saveMutation.mutateAsync(payload);

      alert('✅ Product saved successfully!');
      navigate('/admin/products');
    } catch (err) {
      console.error('❌ Failed to save product:', err);
      alert('Failed to save product. Check console for details.');
    } finally {
      setUploadingImages(false);
    }
  };

  if (!isReady) {
    return (
      <Box p={3}>
        <Typography>Loading product or categories...</Typography>
      </Box>
    );
  }

  return (
    <PageLayout action={EAbilityActions.MANAGE} subject={EAbilitySubjects.ALL}>
      <Box
        sx={{
          mt: `${headerHeight}px`,
          mb: `${footerHeight}px`,
          height: `calc(100vh - ${headerHeight + footerHeight + 120}px)`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={2}
          sx={{
            width: '100%',
            maxWidth: 700,
            height: '100%',
            overflowY: 'auto',
            px: { xs: 2, sm: 3 },
            py: 3,
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" mb={3}>
            {mode === 'add' ? 'Add New Product' : 'Edit Product'}
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={3}>
              <FormTextField
                label="Name"
                register={register('name', { required: 'Name is required' })}
                errorObject={errors.name}
              />

              <Controller
                control={control}
                name="description"
                defaultValue=""
                render={({ field }) => (
                  <Box>
                    <Typography variant="subtitle1" mb={1}>
                      Description
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
                          py: 1,
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormTextField
                  label="Price"
                  type="number"
                  fullWidth
                  register={register('price', {
                    required: 'Price is required',
                  })}
                  errorObject={errors.price}
                />
                <FormTextField
                  label="Stock"
                  type="number"
                  fullWidth
                  register={register('stock')}
                  errorObject={errors.stock}
                />
              </Stack>

              <FormTextField
                label="Category"
                name="categoryId"
                control={control}
                errorObject={errors.categoryId}
                isSelect
                required
                selectOptions={categories.map((cat) => ({
                  label: cat.name,
                  value: cat.id,
                }))}
              />

              {!categories.some((c) => c.id === watchedCategoryId) &&
                watchedCategoryId && (
                  <Typography color="error">
                    ⚠️ Invalid category ID: {watchedCategoryId}
                  </Typography>
                )}

              <Box>
                <Typography variant="subtitle1" mb={1}>
                  Product Images
                </Typography>
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
                  onCloseSnackbar={() => false}
                />
              </Box>

              <Box textAlign="right">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || isUploadingImages}
                >
                  Save
                </Button>
              </Box>
            </Stack>
          </form>
        </Paper>
      </Box>
    </PageLayout>
  );
}
