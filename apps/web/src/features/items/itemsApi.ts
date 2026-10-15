import type { Item, ItemInput } from 'shared';
import { catalogApi } from '../catalog';

// Запросы предметов — общие для каталогов (catalogApi), под адресом /items.
const api = catalogApi<Item, ItemInput>('/items');

export const listItems = api.list;
export const getItem = api.get;
export const createItem = api.create;
export const updateItem = api.update;
export const deleteItem = api.remove;
export const uploadItemImage = api.uploadImage;
export const recropItemImage = api.recropImage;
export const deleteItemImage = api.deleteImage;
export const itemImagePath = api.imagePath;
