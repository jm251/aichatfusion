import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  Auth,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  Firestore 
} from 'firebase/firestore';
import { Message, FirebaseChat } from './types';

export class FirebaseService {
  private static app: FirebaseApp | null = null;
  private static auth: Auth | null = null;
  private static db: Firestore | null = null;
  private static initialized = false;
  private static currentUserId: string | null = null;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    // Check if Firebase is configured
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.info('Firebase not configured. Chat history will be stored locally only.');
      this.initialized = true;
      return;
    }

    try {
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      
      // Sign in anonymously
      const userCredential = await signInAnonymously(this.auth);
      this.currentUserId = userCredential.user.uid;
      
      // console.log('Firebase initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      console.info('Chat history will be stored locally only.');
      this.initialized = true;
    }
  }

  static async getCurrentUserId(): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // If Firebase is not configured or failed, return a local session ID
    if (!this.auth || !this.currentUserId) {
      // Generate or retrieve a local session ID
      let localId = localStorage.getItem('local-session-id');
      if (!localId) {
        localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('local-session-id', localId);
      }
      return localId;
    }
    
    return this.currentUserId;
  }

  static getStorageMode(): 'local' | 'cloud' {
    return this.auth && this.db && this.currentUserId ? 'cloud' : 'local';
  }

  static async saveChat(messages: Message[]): Promise<string | null> {
    if (!this.db || !this.auth?.currentUser) return null;

    try {
      const userId = this.auth.currentUser.uid;
      
      // Sanitize messages before saving
      const sanitizedMessages = messages.map(msg => ({
        id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: msg.content || '',
        role: msg.role || 'user',
        timestamp: msg.timestamp || new Date().toISOString(),
        model: msg.model || null,
        service: msg.service || null,
        responseTime: msg.responseTime || null,
        isError: msg.isError || false,
        errorMessage: msg.errorMessage || null,
        isFinalResponse: msg.isFinalResponse !== undefined ? msg.isFinalResponse : true,
        status: msg.status || 'complete'
      }));
      
      const chatData = {
        userId,
        participants: [userId], // Add participants field with current user
        title: sanitizedMessages[0]?.content.slice(0, 50) || 'New Chat',
        messages: sanitizedMessages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(this.db, 'chats'), chatData);
      return docRef.id;
    } catch (error) {
      console.error('Error saving chat:', error);
      return null;
    }
  }

  static async updateChat(chatId: string, messages: Message[]): Promise<void> {
    if (!this.db || !this.auth?.currentUser) return;

    try {
      const chatRef = doc(this.db, 'chats', chatId);
      
      // Check if document exists and user is a participant
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        console.error('Chat not found');
        return;
      }
      
      const chatData = chatDoc.data();
      if (!chatData.participants?.includes(this.auth.currentUser.uid)) {
        console.error('User is not a participant in this chat');
        return;
      }
      
      // Sanitize messages to ensure no undefined values
      const sanitizedMessages = messages.map(msg => ({
        id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: msg.content || '',
        role: msg.role || 'user',
        timestamp: msg.timestamp || new Date().toISOString(),
        model: msg.model || null,
        service: msg.service || null,
        responseTime: msg.responseTime || null,
        isError: msg.isError || false,
        errorMessage: msg.errorMessage || null,
        isFinalResponse: msg.isFinalResponse !== undefined ? msg.isFinalResponse : true,
        status: msg.status || 'complete'
      }));
      
      await updateDoc(chatRef, {
        messages: sanitizedMessages,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating chat:', error);
      throw error; // Re-throw to handle in the calling component
    }
  }

  static async getAllUserChats(userId: string): Promise<FirebaseChat[]> {
    if (!this.db || !userId) return [];

    try {
      // Query chats where user is a participant
      const q = query(
        collection(this.db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const chats: FirebaseChat[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        chats.push({
          id: doc.id,
          userId: data.userId,
          participants: data.participants || [data.userId], // Ensure backwards compatibility
          title: data.title,
          messages: data.messages || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          model: data.model
        });
      });
      
      return chats;
    } catch (error) {
      console.error('Error getting user chats:', error);
      return [];
    }
  }

  static async getChatById(chatId: string): Promise<FirebaseChat | null> {
    if (!this.db || !this.auth?.currentUser) return null;

    try {
      const chatRef = doc(this.db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        return null;
      }
      
      const data = chatDoc.data();
      
      // Check if user is a participant
      if (!data.participants?.includes(this.auth.currentUser.uid)) {
        console.error('User is not a participant in this chat');
        return null;
      }
      
      return {
        id: chatDoc.id,
        userId: data.userId,
        participants: data.participants || [data.userId], // Ensure backwards compatibility
        title: data.title,
        messages: data.messages || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        model: data.model
      };
    } catch (error) {
      console.error('Error getting chat:', error);
      return null;
    }
  }

  static async deleteChat(chatId: string): Promise<void> {
    if (!this.db || !this.auth?.currentUser) return;

    try {
      const chatRef = doc(this.db, 'chats', chatId);
      
      // Check if user is a participant before deleting
      const chatDoc = await getDoc(chatRef);
      if (!chatDoc.exists()) {
        console.error('Chat not found');
        return;
      }
      
      const chatData = chatDoc.data();
      if (!chatData.participants?.includes(this.auth.currentUser.uid)) {
        console.error('User is not a participant in this chat');
        return;
      }
      
      await deleteDoc(chatRef);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }

  /**
   * Subscribe to real-time updates of user's chats
   */
  static subscribeToUserChats(
    userId: string, 
    callback: (chats: FirebaseChat[]) => void
  ): (() => void) | null {
    if (!this.db || !userId) {
      console.warn('Cannot subscribe to chats: Firebase not initialized or no userId');
      callback([]); // Call with empty array
      return null;
    }

    try {
      const q = query(
        collection(this.db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const chats: FirebaseChat[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          chats.push({
            id: doc.id,
            userId: data.userId,
            participants: data.participants || [data.userId],
            title: data.title,
            messages: data.messages || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            model: data.model
          });
        });
        
        callback(chats);
      }, (error) => {
        console.error('Error subscribing to user chats:', error);
        callback([]); // Return empty array on error
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up chat subscription:', error);
      callback([]); // Call with empty array
      return null;
    }
  }

  static async saveDocumentMetadata(userId: string, metadata: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    try {
      const docRef = doc(this.db!, 'users', userId, 'documents', metadata.id);
      await setDoc(docRef, metadata);
    } catch (error) {
      console.error('Error saving document metadata:', error);
    }
  }

  /**
   * Get all documents for a user
   */
  static async getUserDocuments(userId: string): Promise<any[]> {
    if (!this.db) await this.initialize();
    
    try {
      const docsCollection = collection(this.db!, 'users', userId, 'documents');
      const q = query(docsCollection, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user documents:', error);
      return [];
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(userId: string, docId: string): Promise<void> {
    if (!this.db) await this.initialize();
    
    try {
      const docRef = doc(this.db!, 'users', userId, 'documents', docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  }
}
