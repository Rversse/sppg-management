export interface VolunteerCsvRow {
  full_name: string;
  section_name: string;
  daily_wage: number | null;
  status: "active" | "inactive";
  joined_on: string | null;
  notes: string | null;
}

function safeCell(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  const safe = /^[\s]*[=+@\-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function volunteersToCsv(rows: VolunteerCsvRow[]): string {
  const headers = ["Nama lengkap", "Bagian kerja", "Upah harian (Rp)", "Status", "Tanggal bergabung", "Catatan"];
  const body = rows.map((row) => [
    row.full_name,
    row.section_name,
    row.daily_wage === null ? "" : row.daily_wage * 1000,
    row.status === "active" ? "Aktif" : "Nonaktif",
    row.joined_on,
    row.notes
  ].map(safeCell).join(","));
  return "\uFEFF" + [headers.map(safeCell).join(","), ...body].join("\r\n");
}

export interface VolunteerCsvImportRow { full_name: string; section_name: string; daily_wage: number | null; status: 'active' | 'inactive'; joined_on: string | null; notes: string | null; section_id: string | null; }
export interface VolunteerCsvImportResult { rows: VolunteerCsvImportRow[]; errors: string[]; }
function parseCsvRecords(csv: string): string[][] {
 const records: string[][]=[]; let cells:string[]=[]; let value=''; let quoted=false;
 for(let i=0;i<csv.length;i++){const ch=csv[i]; if(ch==='"'){if(quoted&&csv[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){cells.push(value.trim());value='';}else if((ch==='\\n'||ch==='\\r')&&!quoted){if(ch==='\\r'&&csv[i+1]==='\\n')i++;cells.push(value.trim());if(cells.some(cell=>cell.length>0))records.push(cells);cells=[];value='';}else value+=ch;}
 if(quoted)throw new Error('Tanda kutip CSV tidak berpasangan.');cells.push(value.trim());if(cells.some(cell=>cell.length>0))records.push(cells);return records;
}
function normalizeHeader(value:string){return value.replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[ _-]+/g,' ');}
function validDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;}
export function parseVolunteersCsv(csv:string,sections:{id:string;name:string}[]):VolunteerCsvImportResult {
 let records:string[][];try{records=parseCsvRecords(csv.replace(/^\uFEFF/,''));}catch(error){return {rows:[],errors:[error instanceof Error?error.message:'CSV tidak valid.']};} if(records.length<2)return {rows:[],errors:['CSV harus berisi header dan minimal satu baris data.']};
 const headers=records[0].map(normalizeHeader);
 const aliases:Record<string,string[]>={full_name:['nama lengkap','nama','full name'],section_name:['bagian kerja','bagian','section'],daily_wage:['upah harian (rp)','upah harian','gaji harian','daily wage'],status:['status'],joined_on:['tanggal bergabung','joined on'],notes:['catatan','notes']};
 const indexes=Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,headers.findIndex(header=>names.includes(header))])) as Record<string,number>; if(indexes.full_name<0)return {rows:[],errors:[\"Kolom wajib 'Nama lengkap' tidak ditemukan. Gunakan header dari file ekspor CSV.\"]};
 const sectionMap=new Map(sections.map(section=>[normalizeHeader(section.name),section]));const seen=new Set<string>();const rows:VolunteerCsvImportRow[]=[];const errors:string[]=[];
 for(let index=1;index<records.length;index++){const cells=records[index];
 const get=(key:string)=>indexes[key]<0?'':(cells[indexes[key]]??'').trim();const name=get('full_name');if(name.length<2||name.length>160){errors.push('Baris '+(index+1)+': nama wajib 2–160 karakter.');continue;}
 const key=name.toLocaleLowerCase('id-ID');if(seen.has(key)){errors.push('Baris '+(index+1)+': nama '+name+' duplikat di file.');continue;}seen.add(key);
 const sectionName=get('section_name');const section=sectionName?sectionMap.get(normalizeHeader(sectionName)):undefined;if(sectionName&&!section){errors.push('Baris '+(index+1)+': bagian kerja '+sectionName+' tidak ditemukan di workspace.');continue;}
 const wageText=get('daily_wage').replace(/[.\\s]/g,'').replace(/^Rp/i,'');const wage=wageText===''?null:Number(wageText);if(wage!==null&&(!Number.isSafeInteger(wage)||wage<0)){errors.push('Baris '+(index+1)+': upah harus angka rupiah bulat nol atau lebih.');continue;}
 const statusText=normalizeHeader(get('status'));const status=statusText===''||['aktif','active'].includes(statusText)?'active':['nonaktif','inactive'].includes(statusText)?'inactive':null;if(!status){errors.push('Baris '+(index+1)+': status harus Aktif atau Nonaktif.');continue;}
 const joined=get('joined_on');if(joined&&!validDate(joined)){errors.push('Baris '+(index+1)+': tanggal bergabung harus berformat YYYY-MM-DD.');continue;}const notes=get('notes');if(notes.length>2000){errors.push('Baris '+(index+1)+': catatan maksimal 2.000 karakter.');continue;}
 rows.push({full_name:name,section_name:section?.name??'',section_id:section?.id??null,daily_wage:wage===null?null:wage/1000,status,joined_on:joined||null,notes:notes||null}); } return {rows,errors}; }