import { cn } from '../../lib/utils'; // Adjust path if needed

describe('cn utility', () => {
    it('merges class names correctly', () => {
        expect(cn('w-full', 'h-full')).toBe('w-full h-full');
    });

    it('handles conditional classes', () => {
        expect(cn('w-full', true && 'p-4', false && 'm-4')).toBe('w-full p-4');
    });

    it('merges tailwind classes properly (overriding)', () => {
        expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('handles arrays and objects', () => {
        // cn signature allows any number of arguments, clsx handles arrays
        expect(cn(['text-lg', 'font-bold'])).toBe('text-lg font-bold');
    });
});
