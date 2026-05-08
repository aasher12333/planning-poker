export const normalizeName = (name: string): string => {
    return name.trim().split(' ')[0].toLowerCase();
};

export const getAvatarUrl = (name: string) => {
    const slug = normalizeName(name);
    return `https://ui-avatars.com/api/?name=${slug}&background=random&size=128`;
};