import {describe,expect,it} from 'vitest';
import {parseVolunteersCsv} from './workforce-csv';
const sections=[{id:'section-1',name:'Dapur Utama'}];
describe('parseVolunteersCsv',()=>{
it('parses exported CSV and resolves section names',()=>{const result=parseVolunteersCsv('\uFEFF\"Nama lengkap\",\"Bagian kerja\",\"Upah harian (Rp)\",\"Status\",\"Tanggal bergabung\",\"Catatan\"\r\n\"Siti, Aminah\",\"Dapur Utama\",\"75000\",\"Aktif\",\"2026-11-01\",\"Catatan \"\"khusus\"\"\"',sections);expect(result.errors).toEqual([]);expect(result.rows[0]).toMatchObject({full_name:'Siti, Aminah',section_id:'section-1',daily_wage:75,notes:'Catatan \"khusus\"'});});
it('rejects duplicate names and unknown sections',()=>{const result=parseVolunteersCsv('Nama lengkap,Bagian kerja\nAminah,Dapur Utama\nAminah,Dapur Utama\nBudi,Bagian X',sections);expect(result.rows).toHaveLength(1);expect(result.errors).toHaveLength(2);});
it('rejects invalid wages, status and dates',()=>{const result=parseVolunteersCsv('Nama lengkap,Upah harian (Rp),Status,Tanggal bergabung\nAminah,-5,Aktif,2026-11-01\nBudi,50000,maybe,2026-11-01\nCitra,50000,Aktif,2026-02-30',sections);expect(result.rows).toHaveLength(0);expect(result.errors).toHaveLength(3);});
it('preserves quoted commas, quotes, and embedded newlines',()=>{const result=parseVolunteersCsv('Nama lengkap,Catatan\nAminah,"Baris satu,\nbaris ""dua"""',sections);expect(result.errors).toEqual([]);expect(result.rows[0].notes).toBe('Baris satu,\nbaris "dua"');});
});
