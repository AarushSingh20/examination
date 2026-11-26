import axios from 'axios';
export const api=axios.create({baseURL:'/api'});
api.interceptors.request.use(config=>{
  const token=sessionStorage.getItem('examination_token');
  if(token)config.headers.Authorization=`Bearer ${token}`;
  return config;
});
export function errorMessage(e){return e?.response?.data?.error || e?.message || 'Something went wrong';}
