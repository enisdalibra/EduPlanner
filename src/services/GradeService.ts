export class GradeService {
  static calculateAverage(grades: Record<string, string>): number {
    const values = Object.values(grades).map(g => parseFloat(g)).filter(g => !isNaN(g));
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return sum / values.length;
  }
}