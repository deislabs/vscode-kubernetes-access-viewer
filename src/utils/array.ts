export function splitOn<T>(source: T[], predicate: (t: T) => boolean): T[][] {
    const result = Array.of<T[]>();

    let currentTranche = Array.of<T>();
    result.push(currentTranche);
    for (const t of source) {
        if (predicate(t)) {
            currentTranche = Array.of<T>();
            result.push(currentTranche);
            continue;
        }
        currentTranche.push(t);
    }

    return result;
}