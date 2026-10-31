import re
r=lambda f:open(f,encoding='utf-8').read()
h=r('index.html'); css=r('style.css'); data=r('data.js'); eng=r('engine.js'); app=r('app.js'); wk=r('worker.js'); tabs=r('tables.js')
wk=re.sub(r"importScripts\([^)]*\);\n?","",wk)
wsrc=data+"\n"+eng+"\n"+wk
for s in (css,data,eng,app,wsrc,tabs): assert '</script' not in s.lower() and '</style' not in s.lower()
h=h.replace('<link rel="stylesheet" href="style.css">','<style>\n'+css+'\n</style>')
h=h.replace('<script src="data.js"></script>\n<script src="tables.js"></script>\n<script src="engine.js"></script>\n<script src="app.js"></script>',
 '<script type="text/plain" id="wsrc">\n'+wsrc+'\n</script>\n<script>\n'+data+'\n'+tabs+'\n'+eng+'\n'+app+'\n</script>')
assert 'src="app.js"' not in h and 'href="style.css"' not in h
open('dist/index.html','w',encoding='utf-8').write(h)
print(len(h))
