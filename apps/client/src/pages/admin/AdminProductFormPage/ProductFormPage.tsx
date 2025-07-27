import React, { useEffect, useReducer, useRef } from 'react';
import { Box, Typography, Paper, Stack, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import ReactQuill from 'react-quill';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../firebase';
import { useProduct } from '../../../hooks/useProduct';
import ImageUploader, {
  CombinedImage,
} from '../../../components/ImageUploader';
import {
  productFormReducer,
  initialProductFormState,
} from './productFormReducer';
import FormTextField from '../../../components/FormTextField';
import { useCategories } from '../../../hooks/useCategories';
import { headerHeight, footerHeight } from '../../../config/themeConfig';
export type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
};

import { useSaveProductMutation } from '../../../hooks/useSaveProductMutation';

export default function ProductFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const saveMutation = useSaveProductMutation();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(
    productFormReducer,
    initialProductFormState,
  );
  const hasResetOnce = useRef(false); // 🛡️ Prevent infinite reset

  const { data: product, isLoading: productLoading } = useProduct(productId);
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  console.log('ProductFormPage product:', product);
  console.log('ProductFormPage categories:', categories);
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
        product &&
        categories.length > 0;

  useEffect(() => {
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
  }, [categories]);

  useEffect(() => {
    if (!product || categories.length === 0 || hasResetOnce.current) return;

    try {
      const {
        name = '',
        description = '',
        price = 0,
        stock = 0,
        categoryId = '',
        images = [],
      } = product;

      const validCategoryId = categories.some((c) => c.id === categoryId)
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

      dispatch({ type: 'SET_PRODUCT', payload: product });
      dispatch({ type: 'SET_COMBINED_IMAGES', payload: formattedImages });
      dispatch({ type: 'SET_READY', payload: true });

      hasResetOnce.current = true;
    } catch (err) {
      console.error('🛑 Failed during reset or image conversion:', err);
    }
  }, [product, categories]);

  const handleImageDrop = (files: File[]) => {
    const timestamp = Date.now();
    const newImages: CombinedImage[] = files.map((file, idx) => ({
      id: `${file.name}-${timestamp}-${idx}`,
      url: URL.createObjectURL(file),
      type: 'new',
      file,
      progress: 0,
    }));
    dispatch({ type: 'ADD_COMBINED_IMAGES', payload: newImages });
  };

  async function uploadFile(file: File, productDocId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `products/${productDocId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        () => {
          // TODO (urikhaimov): do something.
          return false;
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        },
      );
    });
  }

  const onSubmit = async (formData: FormState) => {
    try {
      dispatch({ type: 'SET_UPLOADING_IMAGES', payload: true });

      const payload = {
        productId,
        mode,
        data: {
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock),
        },
        images: state.combinedImages,
        deletedImageIds: state.deletedImageIds,
      };

      const savedProductId = await saveMutation.mutateAsync(payload);

      dispatch({ type: 'SET_SHOW_SUCCESS_SNACKBAR', payload: true });
      alert('Product saved successfully!');
      navigate('/admin/products');
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Failed to save product. Check console for details.');
    } finally {
      dispatch({ type: 'SET_UPLOADING_IMAGES', payload: false });
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
            {/* Product Info */}
            <Stack spacing={2}>
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
                selectOptions={state.categories.map((cat) => ({
                  label: cat.name,
                  value: cat.id,
                }))}
              />

              {!state.categories.some((c) => c.id === watchedCategoryId) &&
                watchedCategoryId && (
                  <Typography color="error">
                    ⚠️ Invalid category ID: {watchedCategoryId}
                  </Typography>
                )}
            </Stack>

            {/* Image Section */}
            <Box>
              <Typography variant="subtitle1" mb={1}>
                Product Images
              </Typography>
              <ImageUploader
                images={state.combinedImages}
                onDrop={handleImageDrop}
                onRemove={(id) => {
                  const imageToDelete = state.combinedImages.find(
                    (img) => img.id === id,
                  );
                  if (imageToDelete?.type === 'existing') {
                    dispatch({
                      type: 'ADD_DELETED_IMAGE_ID',
                      payload: imageToDelete.id.replace('existing-', ''),
                    });
                  }

                  dispatch({
                    type: 'SET_COMBINED_IMAGES',
                    payload: state.combinedImages.filter(
                      (img) => img.id !== id,
                    ),
                  });
                }}
                onReorderAll={(newOrder) =>
                  dispatch({ type: 'SET_COMBINED_IMAGES', payload: newOrder })
                }
                showSnackbar={false}
                onCloseSnackbar={() => false}
              />
            </Box>

            {/* Submit */}
            <Box textAlign="right">
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || state.isUploadingImages}
              >
                Save
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
