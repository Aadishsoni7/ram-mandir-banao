// Server-only adapter for the Supabase transaction pooler
// The browser receives public contribution fields through templeService only
const numeric=new Set(['amount_minor','anonymous','created_at','updated_at','presented_at','starts_at','ends_at','duration_seconds','position','expires_at','confirmed_at','n']);
export function postgresQuery(query){let index=0,quoted=false;return query.replace(/'(?:''|[^'])*'|\?/g,part=>part==='?'?'$'+(++index):part).replace(/\btemple_orders\b/g,'ram_mandir.temple_orders').replace(/\btemple_allocations\b/g,'ram_mandir.temple_allocations');}
function rows(result){return Array.from(result,row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,numeric.has(key)&&value!==null?Number(value):value])));}
export function createPostgresDB(sql){
 function prepare(query){let params=[];return {bind(...values){params=values;return this;},async execute(connection=sql){try{const result=await connection.unsafe(postgresQuery(query),params);return {results:rows(result),meta:{changes:result.count??result.length}};}catch(error){console.error('temple_database_error',JSON.stringify({code:String(error.code||'UNKNOWN').slice(0,80),severity:error.severity||null}));throw error;}},async all(){return this.execute();},async first(){return (await this.execute()).results[0]||null;},async run(){return this.execute();}};}
 return {prepare,async batch(items){return sql.begin(async transaction=>{const results=[];for(const item of items)results.push(await item.execute(transaction));return results;});}};
}
