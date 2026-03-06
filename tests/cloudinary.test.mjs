// tests/cloudinary.test.mjs
// Tests for Cloudinary cleanup utilities (Issue 11B)
// Uses dynamic imports because ESM mocking must happen before module load
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';

let deleteFromCloudinary;
let deleteMultipleFromCloudinary;
let mockDestroy;

beforeAll(async () => {
    // Set up mock BEFORE importing the module under test
    mockDestroy = jest.fn();

    jest.unstable_mockModule('../config/cloudinary.mjs', () => ({
        default: {
            uploader: {
                destroy: mockDestroy,
                upload_stream: jest.fn()
            }
        }
    }));

    // Dynamic import AFTER mocking — this picks up the mock
    const mod = await import('../utils/cloudinary.mjs');
    deleteFromCloudinary = mod.deleteFromCloudinary;
    deleteMultipleFromCloudinary = mod.deleteMultipleFromCloudinary;
});

describe('Cloudinary Cleanup Utilities', () => {
    beforeEach(() => {
        mockDestroy.mockReset();
    });

    describe('deleteFromCloudinary', () => {
        it('should skip if publicId is null/undefined/empty', async () => {
            await deleteFromCloudinary(null);
            await deleteFromCloudinary(undefined);
            await deleteFromCloudinary('');

            expect(mockDestroy).not.toHaveBeenCalled();
        });

        it('should call cloudinary.uploader.destroy with the publicId', async () => {
            mockDestroy.mockResolvedValue({ result: 'ok' });

            await deleteFromCloudinary('test/image_123');

            expect(mockDestroy).toHaveBeenCalledWith('test/image_123');
        });

        it('should not throw if cloudinary destroy fails', async () => {
            mockDestroy.mockRejectedValue(new Error('Network error'));

            // Should not throw
            await expect(deleteFromCloudinary('test/image_123')).resolves.toBeUndefined();
        });
    });

    describe('deleteMultipleFromCloudinary', () => {
        it('should skip if array is empty or null', async () => {
            await deleteMultipleFromCloudinary([]);
            await deleteMultipleFromCloudinary(null);

            expect(mockDestroy).not.toHaveBeenCalled();
        });

        it('should filter out falsy values', async () => {
            mockDestroy.mockResolvedValue({ result: 'ok' });

            await deleteMultipleFromCloudinary(['img1', null, undefined, '', 'img2']);

            expect(mockDestroy).toHaveBeenCalledTimes(2);
            expect(mockDestroy).toHaveBeenCalledWith('img1');
            expect(mockDestroy).toHaveBeenCalledWith('img2');
        });

        it('should delete all images in parallel', async () => {
            mockDestroy.mockResolvedValue({ result: 'ok' });

            const ids = ['cover_1', 'gallery_2', 'avatar_3'];
            await deleteMultipleFromCloudinary(ids);

            expect(mockDestroy).toHaveBeenCalledTimes(3);
        });

        it('should not throw if one delete fails', async () => {
            mockDestroy
                .mockResolvedValueOnce({ result: 'ok' })
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValueOnce({ result: 'ok' });

            await expect(
                deleteMultipleFromCloudinary(['img1', 'img2', 'img3'])
            ).resolves.toBeUndefined();
        });
    });
});
