export type AppOption = {
    id: string;
    name: string;
};

export type CatalogCategory = {
    name: string;
    order: number;
    mainstream_apps: AppOption[];
    private_alternatives: AppOption[];
};

/** One category of the pack. Its JSON form is also the export cache key. */
export type PackItem = {
    category: string;
    order: number;
    mainstream_app_id: string;
    mainstream_app_name: string;
    /** Selected alternatives, in the order the user picked them. */
    private_alternatives: AppOption[];
};

export const MAX_PRIVATE_ALTERNATIVES = 3;

export function sortCategories<T extends { order: number }>(categories: T[]) {
    return [...categories].sort((a, b) => a.order - b.order);
}

export function sortByName(apps: AppOption[]) {
    return [...apps].sort((a, b) => a.name.localeCompare(b.name));
}

/** Every category starts with its first listed mainstream app and no alternatives. */
export function createInitialPack(categories: CatalogCategory[]): PackItem[] {
    return sortCategories(categories).map((category) => ({
        category: category.name,
        order: category.order,
        mainstream_app_id: category.mainstream_apps[0].id,
        mainstream_app_name: category.mainstream_apps[0].name,
        private_alternatives: [],
    }));
}

function updateCategory(
    pack: PackItem[],
    categoryName: string,
    update: (item: PackItem) => PackItem,
) {
    return pack.map((item) =>
        item.category === categoryName ? update(item) : item,
    );
}

export function selectMainstreamApp(
    pack: PackItem[],
    categoryName: string,
    app: AppOption,
) {
    return updateCategory(pack, categoryName, (item) => ({
        ...item,
        mainstream_app_id: app.id,
        mainstream_app_name: app.name,
    }));
}

/** Deselects a picked alternative, or appends a new one while under the cap. */
export function togglePrivateAlternative(
    pack: PackItem[],
    categoryName: string,
    app: AppOption,
) {
    return updateCategory(pack, categoryName, (item) => {
        if (item.private_alternatives.some(({ id }) => id === app.id)) {
            return {
                ...item,
                private_alternatives: item.private_alternatives.filter(
                    ({ id }) => id !== app.id,
                ),
            };
        }

        if (item.private_alternatives.length >= MAX_PRIVATE_ALTERNATIVES) {
            return item;
        }

        return {
            ...item,
            private_alternatives: [...item.private_alternatives, app],
        };
    });
}

export function clearPrivateAlternatives(
    pack: PackItem[],
    categoryName: string,
) {
    return updateCategory(pack, categoryName, (item) => ({
        ...item,
        private_alternatives: [],
    }));
}

/** Only categories with at least one alternative appear on the card. */
export function getSelectedPack(pack: PackItem[]) {
    return pack.filter((item) => item.private_alternatives.length > 0);
}

export function getPrivateAlternativeLabel(alternatives: AppOption[]) {
    if (alternatives.length === 0) {
        return "Pick";
    }

    if (alternatives.length === 1) {
        return alternatives[0].name;
    }

    return `${alternatives[0].name} +${alternatives.length - 1}`;
}

/** Picks differ from a fresh pack: an alternative or another mainstream app. */
export function hasPicks(pack: PackItem[], categories: CatalogCategory[]) {
    const initial = createInitialPack(categories);
    return pack.some(
        (item, index) =>
            item.private_alternatives.length > 0 ||
            item.mainstream_app_id !== initial[index]?.mainstream_app_id,
    );
}

/** A category matches when its name or any of its apps' names contains the query. */
export function matchesFilter(category: CatalogCategory, query: string) {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [
        category.name,
        ...category.mainstream_apps.map((app) => app.name),
        ...category.private_alternatives.map((app) => app.name),
    ].some((name) => name.toLowerCase().includes(needle));
}

/** Picks are saved in the browser only, under this key. */
export const PACK_STORAGE_KEY = "alternative-pack:v1";

/** category name -> mainstream app id and picked alternative ids */
export type SavedPack = Record<string, { main: string; alts: string[] }>;

export function serializePack(pack: PackItem[]): SavedPack {
    return Object.fromEntries(
        pack.map((item) => [
            item.category,
            {
                main: item.mainstream_app_id,
                alts: item.private_alternatives.map(({ id }) => id),
            },
        ]),
    );
}

/**
 * Rebuilds a pack from saved picks. Anything that no longer matches the
 * catalog (a renamed category, a removed app) falls back to a fresh pick,
 * and at most MAX_PRIVATE_ALTERNATIVES alternatives are kept.
 */
export function restorePack(
    categories: CatalogCategory[],
    saved: unknown,
): PackItem[] {
    const pack = createInitialPack(categories);
    if (!saved || typeof saved !== "object") return pack;
    const entries = saved as Record<string, unknown>;

    return pack.map((item) => {
        const category = categories.find(({ name }) => name === item.category);
        const entry = Object.hasOwn(entries, item.category)
            ? entries[item.category]
            : null;
        if (!category || !entry || typeof entry !== "object") return item;
        const { main, alts } = entry as { main?: unknown; alts?: unknown };
        const mainApp = category.mainstream_apps.find(({ id }) => id === main);
        const altIds = Array.isArray(alts) ? alts : [];
        const alternatives = altIds
            .map((id) =>
                category.private_alternatives.find((app) => app.id === id),
            )
            .filter((app, index, list): app is AppOption =>
                Boolean(app && list.indexOf(app) === index),
            )
            .slice(0, MAX_PRIVATE_ALTERNATIVES);

        return {
            ...item,
            mainstream_app_id: mainApp?.id ?? item.mainstream_app_id,
            mainstream_app_name: mainApp?.name ?? item.mainstream_app_name,
            private_alternatives: alternatives,
        };
    });
}
