// Media Comments Service - For video comments in /pages/media

export interface MediaComment {
    id: string
    mediaId: string
    userId: string
    userName: string
    userEmail: string
    content: string
    likes: number
    likedBy: string[]
    dislikes: number
    dislikedBy: string[]
    parentId?: string
    parentUserName?: string
    createdAt: Date
}

class MediaCommentService {
    async addComment(
        mediaId: string,
        userId: string,
        userName: string,
        userEmail: string,
        content: string,
        parentId?: string,
        parentUserName?: string
    ): Promise<string> {
        console.warn('[migration] media-comment-service.ts: addComment — no JWT write route yet');
        void mediaId;
        void userId;
        void userName;
        void userEmail;
        void content;
        void parentId;
        void parentUserName;
        return '';
    }

    async getComments(mediaId: string): Promise<MediaComment[]> {
        console.warn('[migration] media-comment-service.ts: getComments — no JWT API route yet');
        void mediaId;
        return [];
    }

    subscribeToComments(mediaId: string, callback: (comments: MediaComment[]) => void): () => void {
        let active = true;
        this.getComments(mediaId).then(comments => {
            if (active) callback(comments);
        });
        const interval = setInterval(async () => {
            if (!active) return;
            const comments = await this.getComments(mediaId);
            if (active) callback(comments);
        }, 15000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }

    async toggleLike(commentId: string, userId: string): Promise<void> {
        console.warn('[migration] media-comment-service.ts: toggleLike — no JWT API route yet');
        void commentId;
        void userId;
    }

    async toggleDislike(commentId: string, userId: string): Promise<void> {
        console.warn('[migration] media-comment-service.ts: toggleDislike — no JWT API route yet');
        void commentId;
        void userId;
    }

    async deleteComment(commentId: string): Promise<void> {
        console.warn('[migration] media-comment-service.ts: deleteComment — no JWT write route yet');
        void commentId;
    }
}

export const mediaCommentService = new MediaCommentService()
export default mediaCommentService
