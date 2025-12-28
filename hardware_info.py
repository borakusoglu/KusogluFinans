import platform
import uuid
import subprocess

def get_wmic_output(command):
    try:
        result = subprocess.run(command, capture_output=True, text=True, shell=True)
        lines = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
        return lines[1] if len(lines) > 1 else 'N/A'
    except:
        return 'N/A'

def format_line(label, value, width=70):
    dots = '.' * (width - len(label) - len(str(value)))
    return f"{label} {dots} {value}"

def main():
    print("=" * 70)
    print("SISTEM VE DONANIM BILGILERI")
    print("=" * 70)
    
    # Sistem bilgileri
    print(format_line("İşletim Sistemi", platform.system()))
    print(format_line("OS Versiyonu", platform.version()))
    print(format_line("Mimari", platform.machine()))
    print(format_line("İşlemci", platform.processor()))
    print(format_line("Bilgisayar Adı", platform.node()))
    
    # MAC Adresi
    mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) 
                    for elements in range(0,2*6,2)][::-1])
    print(format_line("MAC Adresi", mac))
    
    # BIOS Serial
    bios_serial = get_wmic_output('wmic bios get serialnumber')
    print(format_line("BIOS Serial", bios_serial))
    
    # UUID
    uuid_val = get_wmic_output('wmic csproduct get uuid')
    print(format_line("UUID", uuid_val))
    
    # Anakart bilgileri
    mb_manufacturer = get_wmic_output('wmic baseboard get manufacturer')
    print(format_line("Anakart Üretici", mb_manufacturer))
    
    mb_product = get_wmic_output('wmic baseboard get product')
    print(format_line("Anakart Model", mb_product))
    
    mb_serial = get_wmic_output('wmic baseboard get serialnumber')
    print(format_line("Anakart Serial", mb_serial))
    
    # Disk Serial
    disk_serial = get_wmic_output('wmic diskdrive get serialnumber')
    print(format_line("Disk Serial", disk_serial))
    
    print()
    print()
    
    # CPU
    cpu_name = get_wmic_output('wmic cpu get name')
    print(format_line("CPU", cpu_name))
    
    # RAM
    ram = get_wmic_output('wmic computersystem get totalphysicalmemory')
    print(format_line("RAM (GB)", ram))
    
    print("=" * 70)

if __name__ == "__main__":
    main()
