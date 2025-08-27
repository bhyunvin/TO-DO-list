import 'express-session';

declare module 'express-session' {
    interface SessionData {
        userSeq?: number;
        // 다른 세션 속성들...
    }
}