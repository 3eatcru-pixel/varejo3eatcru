import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, UserProfile } from '../types';

export async function createProduct(productData: Partial<Product>, user: UserProfile): Promise<string> {
  const companyId = user.companyId;
  if (!companyId) {
    throw new Error('ID da empresa ausente. Operação com produto negada.');
  }
  const payload = {
    ...productData,
    companyId,
    updatedAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'products'), payload);
  return docRef.id;
}

export async function updateProduct(productId: string, productData: Partial<Product>, user: UserProfile): Promise<void> {
  if (!user.companyId) {
    throw new Error('ID da empresa ausente. Operação com produto negada.');
  }
  const payload = {
    ...productData,
    updatedAt: new Date().toISOString()
  };
  await updateDoc(doc(db, 'products', productId), payload);
}

export async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, 'products', productId));
}

export async function checkBarcodeExists(barcode: string, companyId: string, excludeProductId?: string): Promise<boolean> {
  const q = query(
    collection(db, 'products'), 
    where('companyId', '==', companyId),
    where('barcode', '==', barcode)
  );
  const snap = await getDocs(q);
  if (snap.empty) return false;
  
  if (excludeProductId) {
    const docs = snap.docs.filter(doc => doc.id !== excludeProductId);
    return docs.length > 0;
  }
  
  return true;
}
