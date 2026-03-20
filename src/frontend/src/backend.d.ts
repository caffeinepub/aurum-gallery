import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
}
export interface Moment {
    id: bigint;
    title: string;
    order: bigint;
    date: string;
    createdAt: bigint;
    audioId?: string;
    caption: string;
    imageId: string;
    uploadedBy: string;
    videoId?: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createMoment(title: string, caption: string, date: string, imageId: string, uploadedBy: string, videoId: string | null, audioId: string | null): Promise<bigint>;
    deleteMoment(id: bigint): Promise<void>;
    getAllMoments(): Promise<Array<Moment>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMoment(id: bigint): Promise<Moment | null>;
    getMomentCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateMoment(id: bigint, title: string, caption: string, date: string, imageId: string, videoId: string | null, audioId: string | null): Promise<void>;
}
