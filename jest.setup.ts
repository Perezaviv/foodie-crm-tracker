/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => {
        // eslint-disable-next-line @next/next/no-img-element
        return React.createElement('img', props);
    },
}))

global.TextEncoder = TextEncoder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.TextDecoder = TextDecoder as any

// Mock ResizeObserver
// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

// Mock URL.createObjectURL
if (typeof window !== 'undefined') {
    window.URL.createObjectURL = jest.fn(() => 'mock-url');
    window.URL.revokeObjectURL = jest.fn();
} else {
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
}

// Mock Geolocation
const mockGeolocation = {
    getCurrentPosition: jest.fn().mockImplementation((success) =>
        Promise.resolve(success({
            coords: {
                latitude: 32.0853,
                longitude: 34.7818,
                accuracy: 10
            }
        }))
    ),
    watchPosition: jest.fn()
};
(global as any).navigator.geolocation = mockGeolocation;

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Mock Google Maps Global
(global as any).google = {
    maps: {
        Size: class Size {
            constructor(_width: number, _height: number) { }
        },
        Point: class Point {
            constructor(_x: number, _y: number) { }
        },
        SymbolPath: {
            CIRCLE: 'CIRCLE'
        }
    }
};
