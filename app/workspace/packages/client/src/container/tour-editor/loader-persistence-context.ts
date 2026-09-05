import { createContext } from 'react';
import { ITourLoaderData } from '@fable/common/dist/types';

// Loader edits share the editor's journal, queue, revision rebasing and tab lock.
const LoaderPersistenceContext = createContext<((data: ITourLoaderData) => void) | null>(null);
export default LoaderPersistenceContext;
