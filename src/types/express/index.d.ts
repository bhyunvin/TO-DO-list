import 'express-session';

declare module 'express-session' {
    interface SessionData {
        userSeq?: number;
        userId?: string;
    }
}