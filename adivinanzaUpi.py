import random

diccionario = {
    'Como se le conoce al edificio de Desarrollo Profesional Específico': 'Ingeniería',
    'Como se le conoce al edificio de Estudios Profesionales Genéricos': 'Culturales' ,
    'Como se le conoce al edificio de competencias integrales e institucionales':'Pesados',
    'Como se llama el equipo de futbol americano en UPIICSA': 'Ola Verde',
    'En qué año se fundó UPIICSA': '1971'
}

def adivinanza():
    palabraClave = random.randint(1, 5)  # Del 1 al 5 porque son 5 palabras que adivinar
    intentos = 5  # Número de intentos permitidos
    
    if palabraClave == 1:
        print("Intenta adivinar la palabra, la pista es la siguiente: \n")
        for i in range(1, intentos + 1):
            #El prefijo f antes de las comillas evalúan e insertan en la cadena el intento y el numero de intentos totales
            respuesta = input(f"Intento {i}/{intentos}: ¿Cómo se le conoce al edificio de Desarrollo Profesional Específico? ")
            if respuesta == 'Ingenieria' or respuesta == 'Ingeniería' or respuesta == 'ingeniería' or respuesta == 'ingenieria':
                if i == 1:
                    print("¡Correcto! Lo lograste en el primer intento. ¡Eres increíble! 🏆")
                else:
                    print(f"¡Correcto! Lo lograste en {i} intentos.")
                return
            else:
                print("Respuesta incorrecta.")
        print("Lo siento, has agotado todos los intentos.")

    elif palabraClave == 2:
        print("Intenta adivinar la palabra, la pista es la siguiente: \n")
        for i in range(1, intentos + 1):
            respuesta = input(f"Intento {i}/{intentos}: ¿Cómo se le conoce al edificio de Estudios Profesionales Genéricos? ")
            if respuesta == 'Culturales' or respuesta == 'culturales':
                if i == 1:
                    print("¡Correcto! Lo lograste en el primer intento. ¡Eres brillante! 🌟")
                else:
                    print(f"¡Correcto! Lo lograste en {i} intentos.")
                return
            else:
                print("Respuesta incorrecta.")
        print("Lo siento, has agotado todos los intentos.")
        
    elif palabraClave == 3:
        print("Intenta adivinar la palabra, la pista es la siguiente: \n")
        for i in range(1, intentos + 1):
            respuesta = input(f"Intento {i}/{intentos}: ¿Cómo se le conoce al edificio de competencias integrales e institucionales? ")
            if respuesta == 'Pesados' or respuesta == 'pesados':
                if i == 1:
                    print("¡Correcto! Lo lograste en el primer intento. ¡Eres un genio! 🎉")
                else:
                    print(f"¡Correcto! Lo lograste en {i} intentos.")
                return
            else:
                print("Respuesta incorrecta.")
        print("Lo siento, has agotado todos los intentos.")
        
    elif palabraClave == 4:
        print("Intenta adivinar la palabra clave, la pista es la siguiente: \n")
        for i in range(1, intentos + 1):
            respuesta = input(f"Intento {i}/{intentos}: ¿Cómo se llama el equipo de futbol americano en UPIICSA? ")
            if respuesta == 'Ola Verde' or respuesta == 'ola verde' or respuesta == 'Olaverde' or respuesta == 'olaverde':
                if i == 1:
                    print("¡Correcto! Lo lograste en el primer intento. ¡Qué gran conocimiento! 🏅")
                else:
                    print(f"¡Correcto! Lo lograste en {i} intentos.")
                return
            else:
                print("Respuesta incorrecta.")
        print("Lo siento, has agotado todos los intentos.")
        
    elif palabraClave == 5:
        print("Intenta adivinar la palabra clave, la pista es la siguiente: \n")
        for i in range(1, intentos + 1):
            respuesta = input(f"Intento {i}/{intentos}: ¿En qué año se fundó UPIICSA? ")
            if respuesta == '1971':
                if i == 1:
                    print("¡Correcto! Lo lograste en el primer intento. ¡Impresionante memoria! 🏆")
                else:
                    print(f"¡Correcto! Lo lograste en {i} intentos.")
                return
            else:
                print("Respuesta incorrecta.")
        print("Lo siento, has agotado todos los intentos.")

# Ejecuta la función
adivinanza()
