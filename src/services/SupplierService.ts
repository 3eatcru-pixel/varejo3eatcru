import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Supplier, UserProfile } from '../types';

export async function createSupplier(supplierData: Partial<Supplier>, user: UserProfile): Promise<string> {
  const companyId = user.companyId;
  if (!companyId) {
    throw new Error('ID da empresa ausente. Cadastro de fornecedor negado.');
  }
  const payload = {
    ...supplierData,
    companyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'suppliers'), payload);
  return docRef.id;
}

export async function updateSupplier(supplierId: string, supplierData: Partial<Supplier>): Promise<void> {
  const payload = {
    ...supplierData,
    updatedAt: new Date().toISOString()
  };
  await updateDoc(doc(db, 'suppliers', supplierId), payload);
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  await deleteDoc(doc(db, 'suppliers', supplierId));
}
