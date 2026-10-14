import { expect, it } from 'vitest';
import { displayPath, normalizeDisplayPath } from './display-path';

it('removes Windows verbatim prefixes without corrupting UNC paths', () => {
  expect(normalizeDisplayPath('\\\\?\\C:\\Users\\Jane\\Dev\\refs.yaml')).toBe(
    'C:/Users/Jane/Dev/refs.yaml',
  );
  expect(normalizeDisplayPath('\\\\?\\UNC\\server\\share\\refs.yaml')).toBe(
    '//server/share/refs.yaml',
  );
  expect(normalizeDisplayPath('\\\\server\\share\\refs.yaml')).toBe(
    '//server/share/refs.yaml',
  );
});

it('abbreviates only the native home directory and its actual descendants', () => {
  expect(
    displayPath('\\\\?\\C:\\Users\\Jane\\Dev\\refs.yaml', 'C:\\Users\\Jane'),
  ).toBe('~/Dev/refs.yaml');
  expect(displayPath('c:/users/jane/Dev/refs.yaml', 'C:/Users/Jane/')).toBe(
    '~/Dev/refs.yaml',
  );
  expect(displayPath('C:/Users/Jane', 'C:/Users/Jane')).toBe('~');
  expect(displayPath('C:/Users/Jane-other/refs.yaml', 'C:/Users/Jane')).toBe(
    'C:/Users/Jane-other/refs.yaml',
  );
  expect(displayPath('C:/Users/John/refs.yaml', 'C:/Users/Jane')).toBe(
    'C:/Users/John/refs.yaml',
  );
  expect(displayPath('/home/jane/refs.yaml', '/home/jane')).toBe('~/refs.yaml');
  expect(displayPath('/home/Jane/refs.yaml', '/home/jane')).toBe(
    '/home/Jane/refs.yaml',
  );
  expect(displayPath('/home/jane/../john/refs.yaml', '/home/jane')).toBe(
    '/home/jane/../john/refs.yaml',
  );
  expect(displayPath('C:\\Users\\Jane\\refs.yaml')).toBe(
    'C:/Users/Jane/refs.yaml',
  );
});
