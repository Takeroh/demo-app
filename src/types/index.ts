export type User = {
    id: number;
    name: string;
    email: string;
};

export type Post = {
    id: number;
    title: string;
    content: string;
    authorId: number;
};

export interface ApiResponse<T> {
    data: T;
    error?: string;
}