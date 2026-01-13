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

jest.mock('lucide-react', () => ({
    Upload: () => <div data-testid="upload-icon" />,
    X: () => <div data-testid="close-icon" />,
    Loader2: () => <div data-testid="loader-icon" />,
    Check: () => <div data-testid="check-icon" />,
}));

// Mock fetch
global.fetch = jest.fn();

describe('PhotoUpload Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders upload container', () => {
        render(<PhotoUpload restaurantId="123" />);
        expect(screen.getByText(/Drop photos here/i)).toBeInTheDocument();
    });

    it('handles file selection and upload success', async () => {
        const mockOnComplete = jest.fn();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, photos: [] })
        });

        render(<PhotoUpload restaurantId="123" onUploadComplete={mockOnComplete} />);

        const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
        const fileInput = screen.getByTestId('file-upload');

        expect(fileInput).toBeInTheDocument();

        // Verify URL mock is working
        expect(URL.createObjectURL).toBeDefined();

        // Use fireEvent as it is often more reliable for hidden inputs in jsdom
        await fireEvent.change(fileInput, { target: { files: [file] } });

        // Verify mock was called
        expect(URL.createObjectURL).toHaveBeenCalledWith(file);

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
        const fileInput = screen.getByTestId('file-upload');

        expect(fileInput).toBeInTheDocument();

        await fireEvent.change(fileInput, { target: { files: [file] } });

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
