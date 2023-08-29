def ordinal(n: int) -> str:
    nstr = str(n)
    if nstr[-1] == '1':
        return nstr + 'st'
    if nstr[-1] == '2':
        return nstr + 'nd'
    if nstr[-1] == '3':
        return nstr + 'rd'
    return nstr + 'th'