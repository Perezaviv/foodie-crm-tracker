/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoUpload } from '../../components/PhotoUpload';

// Mock Sonner toast
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    }
}));

// Mock fetch
global.fetch = jest.fn();

describe('PhotoUpload Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders upload button', () => {
        render(<PhotoUpload restaurantId="123" onUploadComplete={jest.fn()} />);
        expect(screen.getByText(/Upload Photos/i)).toBeInTheDocument();
    });

    it('handles file selection and upload success', async () => {
        const mockOnComplete = jest.fn();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, photos: [] })
        });

        render(<PhotoUpload restaurantId="123" onUploadComplete={mockOnComplete} />);

        const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
        const fileInput = screen.getByLabelText(/upload photos/i); // Fixed selector

        expect(fileInput).toBeInTheDocument();

        if (fileInput) {
            await fireEvent.change(fileInput, { target: { files: [file] } });
        }

        // Wait for the files to be processed and state updated
        await waitFor(() => {
            expect(screen.getByText(/Upload 1 photo/i)).toBeInTheDocument();
        });

        // Wait for the files state to update and button to become enabled/visible
        const uploadButton = screen.getByText(/Upload 1 photo/i);
        fireEvent.click(uploadButton);

        // Wait for upload to trigger
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        expect(mockOnComplete).toHaveBeenCalled();
    });

    it('displays error on upload failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ success: false, error: 'Upload broken' })
        });

        render(<PhotoUpload restaurantId="123" onUploadComplete={jest.fn()} />);

        const file = new File(['fail'], 'bad.png', { type: 'image/png' });
        const fileInput = document.querySelector('input[type="file"]');

        if (fileInput) {
            await fireEvent.change(fileInput, { target: { files: [file] } });
        }

        // Wait and find the button that appears
        const uploadButton = await screen.findByText(/Upload 1 photo/i);
        fireEvent.click(uploadButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        // The component sets internal error state instead of toast in the provided file content,
        // so let's check for the error message on screen.
        expect(await screen.findByText('Upload broken')).toBeInTheDocument();
    });
});
