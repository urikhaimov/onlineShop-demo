import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import type { FirebaseRequest } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import * as mime from 'mime-types';
import { admin, adminDb } from '@common/firebase';

function assertOwnerOrAdmin(req: FirebaseRequest, id: string) {
  const uid = req.user?.uid;
  const role = req.user?.role;
  const isAdmin = role === 'admin' || role === 'superadmin';
  if (!uid) throw new ForbiddenException('Not authenticated');
  if (uid !== id && !isAdmin) throw new ForbiddenException('Access denied');
}

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  // GET /users — admin only
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  @Get()
  async findAll() {
    const snapshot = await adminDb.collection('users').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  // GET /users/:id — own profile or admin
  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: FirebaseRequest) {
    assertOwnerOrAdmin(req, id);
    const docRef = adminDb.collection('users').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('User not found');
    return snap.data();
  }

  // PUT /users/:id — own profile or admin
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @Req() req: FirebaseRequest,
  ) {
    assertOwnerOrAdmin(req, id);
    try {
      const docRef = adminDb.collection('users').doc(id);
      const snap = await docRef.get();
      if (!snap.exists) throw new NotFoundException('User not found');

      const updateData: Partial<UpdateUserDto> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.photoURL !== undefined) updateData.photoURL = body.photoURL;

      await docRef.update(updateData);
      return { success: true };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      console.error('🔥 Update error:', error);
      throw new InternalServerErrorException('Failed to update user profile');
    }
  }

  // DELETE /users/:id/avatar — own profile or admin
  @Delete(':id/avatar')
  async deleteAvatar(@Param('id') id: string, @Req() req: FirebaseRequest) {
    assertOwnerOrAdmin(req, id);
    const bucket = admin.storage().bucket();

    try {
      const [files] = await bucket.getFiles({ prefix: `avatars/${id}/` });
      await Promise.all(files.map((file) => file.delete()));

      await adminDb.collection('users').doc(id).update({ photoURL: null });
      return { success: true };
    } catch (error) {
      console.error('🔥 Error deleting avatar:', error.message);
      throw new NotFoundException('Avatar not found or already deleted');
    }
  }

  // POST /users/:id/avatar — own profile or admin
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: FirebaseRequest,
  ): Promise<{ photoURL: string }> {
    assertOwnerOrAdmin(req, id);
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const ext = mime.extension(file.mimetype) || 'jpg';
      const timestamp = Date.now();
      const avatarPath = `avatars/${id}/${timestamp}.${ext}`;
      const bucket = admin.storage().bucket();
      const fileRef = bucket.file(avatarPath);

      await fileRef.save(file.buffer, {
        contentType: file.mimetype,
        public: true,
        metadata: {
          cacheControl: 'public,max-age=60',
        },
      });

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${avatarPath}`;

      await adminDb.collection('users').doc(id).update({
        photoURL: publicUrl,
      });

      return { photoURL: publicUrl };
    } catch (error) {
      console.error('🔥 Upload error:', error.message);
      throw new InternalServerErrorException('Failed to upload avatar');
    }
  }
}
