/**
 * Puente phrase cards selected for Gemlang modules whose grammar or theme
 * already teaches the sentence's main idea. Each phrase pair is preserved so
 * the challenge player can flip meaningful pieces instead of arbitrary words.
 */
const PUENTE_ROWS = [
  ["module-11", "daily life", 2, "Imperfect for background", [["Estaba pensando", "I was thinking"], ["en", "about"], ["mudarme", "moving"], ["a", "to"], ["la costa", "the coast"], ["el año que viene.", "next year."]]],
  ["module-31", "food & drink", 1, "Conditional politeness + gender", [["¿Podrías traerme", "Could you bring me"], ["otro tenedor,", "another fork,"], ["por favor?", "please?"]]],
  ["module-29", "travel", 1, "Train travel in Spain", [["El tren", "The train"], ["con destino a Sevilla", "bound for Seville"], ["sale", "leaves"], ["de la vía tres.", "from platform three."]]],
  ["module-stem-changing", "work & school", 1, "preferir + bare infinitive", [["Prefiero", "I'd rather"], ["trabajar", "work"], ["desde casa", "from home"], ["los viernes.", "on Fridays."]]],
  ["module-11", "feelings & opinions", 2, "Imperfect description", [["Parecía", "She seemed"], ["molesta", "upset"], ["cuando", "when"], ["le dimos", "we gave her"], ["la noticia.", "the news."]]],
  ["module-22", "plans & hypotheticals", 3, "si + imperfect subjunctive → conditional", [["Si tuviera", "If I had"], ["más tiempo,", "more time,"], ["aprendería", "I would learn"], ["a tocar", "to play"], ["la guitarra.", "the guitar."]]],
  ["module-41", "city & home", 1, "Adjective position", [["El nuevo mercado", "The new market"], ["abre", "opens"], ["a las nueve", "at nine"], ["cada mañana.", "every morning."]]],
  ["module-24", "health", 3, "llevar + gerund = duration", [["Llevo", "I've been"], ["sintiéndome", "feeling"], ["mucho mejor", "much better"], ["desde que", "since"], ["empecé", "I started"], ["a correr.", "running."]]],
  ["module-11", "past & memories", 2, "Imperfect for habits", [["Cuando era", "When I was"], ["niño,", "a child,"], ["íbamos", "we used to go"], ["a casa de mi abuela.", "to my grandmother's house."]]],
  ["module-ser-vs-estar-2", "feelings & opinions", 2, "estar + past participle", [["Sinceramente,", "Honestly,"], ["creo que", "I think"], ["esta película", "this movie"], ["está", "is"], ["sobrevalorada.", "overrated."]]],
  ["module-9", "weather", 1, "ir a + infinitive future", [["Dicen que", "They say"], ["va a llover", "it's going to rain"], ["todo el fin de semana.", "all weekend."]]],
  ["module-37", "technology", 2, "dejar de + infinitive", [["Mi móvil", "My phone"], ["dejó de funcionar", "stopped working"], ["justo cuando", "right when"], ["lo necesitaba.", "I needed it."]]],
  ["module-por-vs-para", "daily life", 2, "por = reason or gratitude", [["Gracias por", "Thank you for"], ["ayudarme", "helping me"], ["con la mudanza", "with the move"], ["el sábado.", "on Saturday."]]],
  ["module-ser-vs-estar-2", "food & drink", 3, "estar vs ser", [["La sopa está", "The soup is"], ["demasiado salada,", "too salty,"], ["pero el servicio es", "but the service is"], ["excelente.", "excellent."]]],
  ["module-19", "feelings & opinions", 3, "no creo que + subjunctive", [["No creo que", "I don't think"], ["tenga tiempo", "(I) have time"], ["para verte", "to see you"], ["hoy.", "today."]]],
  ["module-16", "city & home", 2, "Imperative + future time clause", [["Por favor, apaga", "Please turn off"], ["la luz", "the light"], ["cuando salgas", "when you leave"], ["de la habitación.", "of the room."]]],
  ["module-past-comparison", "past & memories", 2, "Reflexive preterite with imperfect background", [["Me acosté", "I went to bed"], ["tarde", "late"], ["anoche", "last night"], ["porque estaba terminando", "because I was finishing"], ["un libro.", "a book."]]],
  ["module-verb-hacer", "daily life", 3, "hace + time + present", [["Hace dos años que", "It's been two years since"], ["vivo en este barrio,", "I've lived in this neighborhood,"], ["y todavía me pierdo.", "and I still get lost."]]],
  ["module-19", "plans & hypotheticals", 3, "cuando + subjunctive for future", [["Cuando termine el proyecto,", "When I finish the project,"], ["vamos a celebrarlo", "we're going to celebrate it"], ["por todo lo alto.", "in style."]]],
  ["module-gustar-family", "people & family", 3, "gustar-family verbs", [["A mi hermano le encantaría venir,", "My brother would love to come,"], ["pero tiene exámenes esa semana.", "but he has exams that week."]]],
  ["module-15", "people & family", 3, "Double object pronouns", [["Si te gusta el libro,", "If you like the book,"], ["te lo presto", "I'll lend it to you"], ["sin problema.", "no problem."]]],
  ["module-por-vs-para", "shopping", 3, "para vs por", [["Este regalo es para ti;", "This gift is for you;"], ["pagué poco por él.", "I paid little for it."]]],
  ["module-past-comparison", "past & memories", 3, "Imperfect interrupted by preterite", [["Mientras cenábamos,", "While we were having dinner,"], ["sonó el teléfono", "the phone rang"], ["y nadie quiso contestar.", "and nobody wanted to answer."]]],
  ["module-verb-tener", "food & drink", 2, "tener expressions", [["Tenía mucho frío,", "I was very cold,"], ["así que pedí", "so I ordered"], ["un té caliente.", "a hot tea."]]],
  ["module-11", "people & family", 2, "Impersonal haber in the past", [["Había mucha gente", "There were a lot of people"], ["en la fiesta,", "at the party,"], ["así que nos fuimos pronto.", "so we left early."]]],
  ["module-13", "feelings & opinions", 2, "Attached direct-object pronoun", [["¿Podrías repetirlo", "Could you repeat it"], ["más despacio,", "more slowly,"], ["por favor?", "please?"]]],
  ["module-19", "feelings & opinions", 3, "Emotion triggers subjunctive", [["Me alegra que", "I'm glad that"], ["hayas venido", "you've come"], ["a la fiesta.", "to the party."]]],
  ["module-37", "technology", 3, "Relative que", [["Ese coche rojo es de mi vecino,", "That red car belongs to my neighbor,"], ["que siempre aparca fatal.", "who always parks terribly."]]],
  ["module-30", "work & school", 1, "Telling time + de sobra", [["La reunión es a las tres y media,", "The meeting is at three thirty,"], ["así que tenemos tiempo de sobra.", "so we have plenty of time."]]],
  ["module-saber-vs-conocer", "people & family", 3, "conocer vs saber", [["Conozco al autor,", "I know the author,"], ["pero no sé dónde vive.", "but I don't know where he lives."]]],
  ["module-42", "hobbies & free time", 2, "seguir + gerund", [["Sigo practicando español", "I keep practicing Spanish"], ["todos los días,", "every day,"], ["aunque me cuesta bastante.", "even though I find it quite hard."]]],
  ["module-verb-hacer", "weather", 1, "hacer for weather", [["Ayer", "Yesterday"], ["hizo muchísimo calor.", "it was extremely hot."]]],
  ["module-verb-tener", "work & school", 2, "tener que + infinitive", [["Tengo que terminar el informe", "I have to finish the report"], ["antes del viernes,", "before Friday,"], ["sin falta.", "without fail."]]],
  ["module-19", "plans & hypotheticals", 3, "ojalá + subjunctive", [["Ojalá haga buen tiempo", "Let's hope the weather is nice"], ["el día de la excursión.", "the day of the trip."]]],
  ["module-42", "hobbies & free time", 2, "quedar = to meet up", [["Quedamos los jueves", "We meet on Thursdays"], ["para practicar español", "to practice Spanish"], ["en una cafetería.", "in a café."]]],
  ["module-7", "daily life", 1, "Present-tense routine", [["Me levanto", "I get up"], ["a las siete", "at seven"], ["todos los días.", "every day."]]],
  ["module-verb-hacer", "weather", 1, "hace + weather noun", [["En verano", "In summer"], ["hace mucho calor", "it's very hot"], ["en Sevilla.", "in Seville."]]],
  ["module-35", "food & drink", 1, "poner for ordering in Spain", [["¿Me pone", "Could I have"], ["un café con leche,", "a coffee with milk,"], ["por favor?", "please?"]]],
  ["module-ir-y-venir", "travel", 1, "ir + destination", [["Vamos", "We're going"], ["a la playa", "to the beach"], ["en coche.", "by car."]]],
  ["module-verb-tener", "people & family", 1, "tener + age", [["Mi hermana pequeña", "My little sister"], ["tiene diez años", "is ten years old"], ["y es muy simpática.", "and is really nice."]]],
  ["module-hay-vs-esta", "city & home", 1, "hay + existence", [["Hay una panadería nueva", "There's a new bakery"], ["en mi calle.", "on my street."]]],
  ["module-5", "work & school", 1, "Present-tense routine", [["Estudio español", "I study Spanish"], ["por las tardes,", "in the afternoons,"], ["después del trabajo.", "after work."]]],
  ["module-40", "shopping", 1, "costar + las rebajas", [["Este jersey", "This jumper"], ["cuesta veinte euros", "costs twenty euros"], ["en las rebajas.", "in the sales."]]],
  ["module-42", "hobbies & free time", 1, "jugar a + sport", [["Los domingos", "On Sundays"], ["jugamos al fútbol", "we play football"], ["en el parque.", "in the park."]]],
  ["module-gustar-family", "health", 1, "doler + body part", [["Me duele la cabeza,", "I've got a headache,"], ["pero no tengo", "but I don't have"], ["fiebre.", "a fever."]]],
  ["module-8", "feelings & opinions", 1, "gustar + infinitive", [["No me gusta", "I don't like"], ["levantarme temprano", "getting up early"], ["los sábados.", "on Saturdays."]]],
  ["module-10", "past & memories", 1, "Preterite of ir", [["El sábado", "On Saturday"], ["fuimos al cine", "we went to the cinema"], ["con unos amigos.", "with some friends."]]],
  ["module-10", "travel", 2, "Preterite narrative", [["Cogimos", "We took"], ["un taxi", "a taxi"], ["desde el aeropuerto", "from the airport"], ["porque llegamos tarde.", "because we arrived late."]]],
  ["module-16", "food & drink", 2, "Vosotros imperative", [["¡Venid a cenar", "Come and have dinner"], ["a casa", "at our place"], ["el viernes!", "on Friday!"]]],
  ["module-7", "daily life", 2, "Reflexive verbs", [["Nos levantamos", "We got up"], ["muy temprano", "very early"], ["para coger", "to catch"], ["el primer tren.", "the first train."]]],
  ["module-12", "technology", 2, "se me ha olvidado", [["Se me ha olvidado", "I've forgotten"], ["el cargador del móvil", "my phone charger"], ["otra vez.", "again."]]],
  ["module-41", "city & home", 2, "Comparatives", [["Nuestro piso", "Our flat"], ["es más pequeño", "is smaller"], ["que el anterior,", "than our old one,"], ["pero tiene", "but it has"], ["mucha más luz.", "much more light."]]],
  ["module-9", "plans & hypotheticals", 2, "ir a + infinitive", [["¿A qué hora", "What time"], ["vais a llegar", "are you all going to arrive"], ["mañana?", "tomorrow?"]]],
  ["module-past-comparison", "past & memories", 2, "Imperfect continuous + preterite", [["Estaba lloviendo", "It was raining"], ["cuando salimos", "when we left"], ["del trabajo.", "work."]]],
  ["module-40", "shopping", 2, "Poder + attached pronoun", [["¿Me puedes", "Can you"], ["enseñar ese abrigo", "show me that coat"], ["del escaparate?", "in the shop window?"]]],
  ["module-32", "health", 2, "encontrarse bien or mal", [["Mi abuelo", "My grandad"], ["no se encuentra bien,", "isn't feeling well,"], ["así que se queda", "so he's staying"], ["en casa hoy.", "home today."]]],
  ["module-43", "feelings & opinions", 2, "echar de menos", [["Echo de menos", "I really miss"], ["el pan", "the bread"], ["de mi pueblo.", "from my town."]]],
  ["module-gustar-family", "hobbies & free time", 2, "apetecer", [["¿Te apetece", "Do you fancy"], ["ver una peli", "watching a film"], ["esta noche?", "tonight?"]]],
  ["module-22", "plans & hypotheticals", 3, "Third conditional", [["Si hubiéramos sabido", "If we had known"], ["que cerraban tan pronto,", "that they closed so early,"], ["habríamos ido antes.", "we would have gone earlier."]]],
  ["module-18", "food & drink", 3, "Subjunctive in relative clauses", [["Busco un restaurante", "I'm looking for a restaurant"], ["que tenga", "that does"], ["menú del día", "a set lunch"], ["cerca del museo.", "near the museum."]]],
  ["module-20", "work & school", 3, "antes de que + subjunctive", [["Termina el informe", "Finish the report"], ["antes de que vuelva", "before ... comes back"], ["mi jefa.", "my boss."]]],
  ["module-19", "feelings & opinions", 3, "no me parece que + subjunctive", [["No me parece que", "I don't think"], ["sea buena idea", "it's a good idea"], ["comprar ese coche.", "to buy that car."]]],
  ["module-38", "people & family", 3, "Non-restrictive relative clause", [["Mi prima,", "My cousin,"], ["que acaba de mudarse", "who's just moved"], ["a Valencia,", "to Valencia,"], ["busca piso", "is looking for a flat"], ["en el centro.", "in the centre."]]],
  ["module-20", "health", 3, "recomendar que + subjunctive", [["El médico", "The doctor"], ["me ha recomendado", "has recommended"], ["que desayune", "that I have breakfast"], ["antes de entrenar.", "before working out."]]],
  ["module-19", "weather", 3, "Mixed moods", [["Aunque", "Even though"], ["está nublado,", "it's cloudy,"], ["no creo que llueva", "I don't think it'll rain"], ["esta tarde.", "this afternoon."]]],
  ["module-22", "shopping", 3, "Conditional perfect", [["Habría pagado", "I would have paid"], ["el doble", "twice as much"], ["por este abrigo,", "for this coat,"], ["pero estaba agotado.", "but it was sold out."]]],
  ["module-23", "technology", 3, "acabar de + infinitive", [["Acabo de actualizar", "I've just updated"], ["el sistema", "the system"], ["y ahora", "and now it"], ["va más lento.", "runs slower."]]],
  ["module-11", "past & memories", 3, "soler in the imperfect", [["Solíamos pasar", "We used to spend"], ["los veranos", "our summers"], ["en un pueblo", "in a village"], ["cerca del mar.", "by the sea."]]],
  ["module-ir-y-venir", "daily life", 1, "ir a + infinitive of purpose", [["Voy al supermercado", "I'm going to the supermarket"], ["a comprar", "to buy"], ["pan y leche.", "bread and milk."]]],
  ["module-29", "travel", 1, "Superlative adjective", [["¿Dónde está", "Where is"], ["la parada de autobús", "the bus stop"], ["más cercana?", "nearest?"]]],
  ["module-31", "food & drink", 1, "Polite ordering", [["Quisiera", "I'd like"], ["una tortilla de patatas", "a Spanish omelette"], ["sin cebolla,", "without onion,"], ["por favor.", "please."]]],
  ["module-38", "people & family", 1, "vivir en + place", [["Mis padres", "My parents"], ["viven", "live"], ["en un pueblo", "in a town"], ["cerca de Valencia.", "near Valencia."]]],
  ["module-verb-hacer", "weather", 1, "hacer for weather", [["Hoy hace fresco,", "It's cool today,"], ["pero no llueve.", "but it isn't raining."]]],
  ["module-41", "city & home", 1, "piso = flat", [["El piso", "The flat"], ["tiene", "has"], ["dos habitaciones", "two bedrooms"], ["y un balcón pequeño.", "and a small balcony."]]],
  ["module-12", "hobbies & free time", 1, "Present perfect for recent plans", [["He quedado", "I've arranged to meet"], ["con Marta", "Marta"], ["a las seis.", "at six."]]],
  ["module-37", "technology", 1, "antes de + infinitive", [["Necesito", "I need to"], ["cargar el móvil", "charge my phone"], ["antes de salir.", "before going out."]]],
  ["module-8", "feelings & opinions", 1, "gustar + noun", [["Me gusta mucho", "I really like"], ["este barrio.", "this neighbourhood."]]],
  ["module-2", "health", 1, "al lado de", [["La farmacia", "The pharmacy"], ["está", "is"], ["al lado del banco.", "next to the bank."]]],
  ["module-40", "shopping", 1, "Asking the price", [["¿Cuánto cuesta", "How much is"], ["esta camiseta?", "this T-shirt?"]]],
  ["module-42", "daily life", 1, "soler + infinitive", [["Los domingos", "On Sundays"], ["solemos comer", "we usually eat"], ["en casa.", "at home."]]],
  ["module-ir-y-venir", "travel", 1, "coger + transport", [["Coge el metro", "Take the metro"], ["hasta Sol.", "to Sol."]]],
  ["module-9", "hobbies & free time", 1, "ir a + infinitive future", [["Esta tarde", "This afternoon"], ["voy a dar", "I'm going for"], ["un paseo.", "a walk."]]],
  ["module-10", "travel", 2, "tener que in the past", [["Ayer", "Yesterday"], ["perdí el autobús", "I missed the bus"], ["y tuve que", "and had to"], ["ir andando.", "walk."]]],
  ["module-24", "city & home", 2, "llevar + time + gerund", [["Llevo tres meses", "I've been"], ["viviendo", "living"], ["en Zaragoza.", "in Zaragoza."]]],
  ["module-16", "people & family", 2, "Future time clause + imperative", [["Cuando llegues,", "When you arrive,"], ["mándame", "send me"], ["un mensaje.", "a message."]]],
  ["module-12", "city & home", 2, "dejarse algo", [["Me he dejado", "I've left"], ["las llaves", "the keys"], ["dentro del piso.", "inside the flat."]]],
  ["module-19", "plans & hypotheticals", 2, "aunque + subjunctive", [["Aunque haga frío,", "Even if it's cold,"], ["saldremos", "we'll go out"], ["a tomar algo.", "for a drink."]]],
  ["module-23", "hobbies & free time", 2, "acabar de + infinitive", [["Acabo de terminar", "I've just finished"], ["una serie", "a TV series"], ["buenísima.", "that was brilliant."]]],
  ["module-18", "health", 2, "decir que + subjunctive", [["El médico", "The doctor"], ["me ha dicho", "has told me"], ["que descanse", "to rest"], ["unos días.", "for a few days."]]],
  ["module-37", "technology", 2, "quedarse sin", [["Nos quedamos", "We were left"], ["sin cobertura", "without phone signal"], ["en mitad del viaje.", "halfway through the journey."]]],
  ["module-40", "shopping", 2, "quedar for fit", [["Esta chaqueta", "This jacket"], ["me queda", "fits me"], ["un poco grande.", "a little too big."]]],
  ["module-22", "plans & hypotheticals", 3, "Third conditional", [["Si lo hubiera sabido,", "If I'd known,"], ["habría venido", "I would have come"], ["antes.", "earlier."]]],
  ["module-28", "people & family", 3, "Conditional + imperfect subjunctive", [["Me habría gustado", "I would have liked"], ["que vinierais", "you all to come"], ["con nosotros.", "with us."]]],
  ["module-24", "city & home", 3, "llevar + time + gerund", [["Lleva toda la mañana", "He has spent all morning"], ["quejándose", "complaining"], ["del ruido.", "about the noise."]]],
  ["module-22", "travel", 3, "de + perfect infinitive", [["De haberlo sabido,", "Had I known,"], ["no habría reservado", "I wouldn't have booked"], ["ese hotel.", "that hotel."]]],
  ["module-3", "work & school", 1, "ser + profession", [["Mi vecino", "My neighbor"], ["es bombero", "is a firefighter"], ["en Valencia.", "in Valencia."]]],
  ["module-ser-vs-estar-2", "feelings & opinions", 1, "estar + feelings", [["Los niños", "The children"], ["están cansados", "are tired"], ["porque es muy tarde.", "because it's very late."]]],
  ["module-verb-tener", "food & drink", 1, "tener sed", [["Tengo mucha sed,", "I'm really thirsty,"], ["¿me traes", "can you get me"], ["algo de beber?", "something to drink?"]]],
  ["module-40", "shopping", 1, "Demonstratives", [["Este bolso", "This bag"], ["es bonito", "is nice"], ["pero es carísimo.", "but it's very expensive."]]],
  ["module-verb-hacer", "weather", 1, "llover and nevar", [["Aquí nunca nieva", "It never snows here"], ["pero llueve bastante.", "but it rains quite a lot."]]],
  ["module-7", "daily life", 1, "Reflexive acostarse", [["Me acuesto pronto", "I go to bed early"], ["los días de trabajo.", "on workdays."]]],
  ["module-5", "travel", 1, "Regular -ar verb", [["Mi familia viaja", "My family travels"], ["a Mallorca", "to Mallorca"], ["todos los veranos.", "every summer."]]],
  ["module-6", "hobbies & free time", 1, "Regular -er verb", [["Leo novelas", "I read novels"], ["en el metro", "on the metro"], ["para desconectar.", "to unwind."]]],
  ["module-38", "people & family", 1, "Possessive nuestro", [["Nuestro abuelo", "Our grandad"], ["prepara la paella", "makes the paella"], ["como nadie.", "like nobody else."]]],
  ["module-ser-vs-estar-3", "food & drink", 1, "ser vs estar basics", [["El café es caro", "The coffee is expensive"], ["pero está muy bueno.", "but it tastes great."]]],
  ["module-6", "food & drink", 1, "Present tense", [["Siempre cenamos", "We always have dinner"], ["juntos", "together"], ["a las nueve.", "at nine."]]],
  ["module-hay-vs-esta", "work & school", 1, "Question words + hay", [["¿Cuántos alumnos", "How many students"], ["hay en tu clase?", "are there in your class?"]]],
  ["module-11", "past & memories", 2, "Imperfect for description", [["El cine", "The cinema"], ["de mi barrio", "in my neighborhood"], ["olía siempre", "always smelled"], ["a palomitas.", "of popcorn."]]],
  ["module-12", "shopping", 2, "Present perfect + object pronouns", [["No encuentro mis gafas", "I can't find my glasses"], ["por ningún lado,", "anywhere,"], ["creo que", "I think"], ["las he perdido.", "I've lost them."]]],
  ["module-17", "daily life", 2, "Negative command", [["No apagues el móvil,", "Don't turn off your phone,"], ["espera mi llamada.", "wait for my call."]]],
  ["module-gustar-family", "feelings & opinions", 2, "molestar like gustar", [["A mi madre", "My mother"], ["le molesta", "gets annoyed by"], ["el ruido del bar", "the noise from the bar"], ["de abajo.", "downstairs."]]],
  ["module-24", "health", 2, "llevar sin + infinitive", [["Llevo tres semanas", "I've spent three weeks"], ["sin dormir bien", "not sleeping properly"], ["por los exámenes.", "because of exams."]]],
  ["module-29", "travel", 2, "quedar = to have left", [["Nos quedan dos días", "We have two days left"], ["en Barcelona", "in Barcelona"], ["y mil cosas", "and a thousand things"], ["por ver.", "still to see."]]],
  ["module-37", "technology", 2, "apagarse solo", [["El portátil", "The laptop"], ["se me apaga", "keeps switching off"], ["solo,", "by itself,"], ["cada diez minutos.", "every ten minutes."]]],
  ["module-10", "food & drink", 2, "pedir in preterite", [["Anoche pedimos", "Last night we ordered"], ["unas croquetas", "some croquetas"], ["y estaban buenísimas.", "and they were amazing."]]],
  ["module-gustar-family", "work & school", 2, "faltar + indirect object", [["Me faltan", "I still need"], ["dos páginas", "two more pages"], ["para terminar el informe.", "to finish the report."]]],
  ["module-38", "people & family", 2, "casarse + reflexive", [["Mi hermana se casa", "My sister is getting married"], ["en octubre", "in October"], ["y voy a ser", "and I'm going to be"], ["la madrina.", "the maid of honor."]]],
  ["module-28", "feelings & opinions", 3, "como si + imperfect subjunctive", [["Habla del tema", "He talks about the topic"], ["como si fuera", "as if he were"], ["un experto.", "an expert."]]],
  ["module-28", "plans & hypotheticals", 3, "ojalá + pluperfect subjunctive", [["Ojalá hubiera estudiado", "I wish I had studied"], ["de joven;", "when I was young,"], ["ahora me cuesta", "now I find it"], ["más.", "harder."]]],
  ["module-19", "travel", 3, "en cuanto + present subjunctive", [["En cuanto lleguemos", "As soon as we arrive"], ["al aeropuerto,", "at the airport,"], ["te escribo.", "I'll text you."]]],
  ["module-19", "technology", 3, "quizás + subjunctive", [["Quizás haya", "There may be"], ["una actualización pendiente;", "a pending update;"], ["compruébalo", "Check it"], ["y reinicia el router.", "and restart the router."]]],
  ["module-20", "daily life", 3, "hace falta que + subjunctive", [["Hace falta que", "Someone needs to"], ["recogamos la casa", "tidy the flat up"], ["antes de que lleguen", "before ... arrive"], ["tus padres.", "your parents."]]],
  ["module-11", "past & memories", 3, "ir + gerund", [["Los años fueron pasando", "The years went by"], ["y el pueblo", "and the village"], ["fue cambiando.", "kept changing."]]],
  ["module-32", "health", 3, "ponerse + adjective", [["Con esta gripe", "With this flu"], ["tan fuerte,", "this bad,"], ["me he puesto", "I've become"], ["malísimo.", "really ill."]]],
  ["module-19", "work & school", 3, "a menos que + subjunctive", [["Trabajaremos desde casa", "We'll work from home"], ["a menos que", "unless"], ["nos pidan", "they ask us"], ["volver a la oficina.", "to go back to the office."]]],
];

const sentencesByModule = PUENTE_ROWS.reduce((map, row, index) => {
  const [moduleId, topic, level, note, pairs] = row;
  const translationChunks = pairs.map(([spanish, english]) => ({ spanish, english }));
  const sentence = {
    id: `puente-${String(index + 1).padStart(3, '0')}`,
    spanish: translationChunks.map((chunk) => chunk.spanish).join(' '),
    english: translationChunks.map((chunk) => chunk.english).join(' '),
    wordMeanings: Object.fromEntries(translationChunks.map((chunk) => [chunk.spanish, chunk.english])),
    translationChunks,
    source: 'puente',
    puente: { topic, level, note },
  };

  if (!map[moduleId]) map[moduleId] = [];
  map[moduleId].push(sentence);
  return map;
}, {});

export const getPuenteSentenceCount = (moduleId) => sentencesByModule[moduleId]?.length || 0;

export const integratePuenteSentences = (module) => {
  const additions = sentencesByModule[module.id] || [];
  if (additions.length === 0) return module;

  const existingSpanish = new Set(
    (module.sentences || []).map((sentence) => sentence.spanish.toLocaleLowerCase().trim())
  );
  const uniqueAdditions = additions.filter(
    (sentence) => !existingSpanish.has(sentence.spanish.toLocaleLowerCase().trim())
  );

  return {
    ...module,
    sentences: [...(module.sentences || []), ...uniqueAdditions],
  };
};

export const PUENTE_SENTENCE_COUNT = PUENTE_ROWS.length;

